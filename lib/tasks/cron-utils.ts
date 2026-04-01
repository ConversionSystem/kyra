// ============================================================================
// Lightweight cron next-run calculator
// Supports standard 5-field cron: min hour dom month dow
// No external dependencies.
// ============================================================================

/**
 * Parse a 5-field cron expression and calculate the next run time after `after`.
 * Returns null if the expression is invalid.
 *
 * Supported syntax:
 *  - Literal numbers: 0, 9, 15
 *  - Wildcard: *
 *  - Step: * /6 (written without space), 0/12
 *  - Range: 1-5
 *  - List: 1,3,5
 *
 * Does NOT support: L, W, #, ?, or year field.
 */
export function getNextCronRun(cron: string, after: Date = new Date()): Date | null {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const minuteSet = parseField(parts[0], 0, 59);
    const hourSet = parseField(parts[1], 0, 23);
    const domSet = parseField(parts[2], 1, 31);
    const monthSet = parseField(parts[3], 1, 12);
    const dowSet = parseField(parts[4], 0, 6); // 0=Sun

    if (!minuteSet || !hourSet || !domSet || !monthSet || !dowSet) return null;

    // Start from 1 minute after `after` to avoid re-triggering
    const cursor = new Date(after.getTime() + 60_000);
    cursor.setUTCSeconds(0, 0);

    // Iterate up to 1 year (avoid infinite loops)
    const maxIterations = 525_960; // ~365.25 days in minutes
    for (let i = 0; i < maxIterations; i++) {
      const m = cursor.getUTCMonth() + 1; // 1-12
      if (!monthSet.has(m)) {
        // Skip to next month
        cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
        cursor.setUTCHours(0, 0, 0, 0);
        continue;
      }

      const dom = cursor.getUTCDate();
      const dow = cursor.getUTCDay();
      if (!domSet.has(dom) || !dowSet.has(dow)) {
        // Skip to next day
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        cursor.setUTCHours(0, 0, 0, 0);
        continue;
      }

      const h = cursor.getUTCHours();
      if (!hourSet.has(h)) {
        // Skip to next hour
        cursor.setUTCHours(cursor.getUTCHours() + 1, 0, 0, 0);
        continue;
      }

      const min = cursor.getUTCMinutes();
      if (!minuteSet.has(min)) {
        cursor.setUTCMinutes(cursor.getUTCMinutes() + 1, 0, 0);
        continue;
      }

      // All fields match
      return new Date(cursor.getTime());
    }

    return null; // No match found within 1 year
  } catch {
    return null;
  }
}

function parseField(field: string, min: number, max: number): Set<number> | null {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const [, range, stepStr] = stepMatch;
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) return null;

      let start = min;
      let end = max;
      if (range !== '*') {
        const r = parseRange(range, min, max);
        if (!r) return null;
        start = r[0];
        end = r[1];
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.includes('-')) {
      const r = parseRange(part, min, max);
      if (!r) return null;
      for (let i = r[0]; i <= r[1]; i++) values.add(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < min || n > max) return null;
      values.add(n);
    }
  }

  return values.size > 0 ? values : null;
}

function parseRange(s: string, min: number, max: number): [number, number] | null {
  const parts = s.split('-');
  if (parts.length !== 2) return null;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  if (isNaN(a) || isNaN(b) || a < min || b > max || a > b) return null;
  return [a, b];
}

/**
 * Human-readable description of a cron expression.
 */
export function describeCron(cron: string): string {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return cron;

    const [min, hour, dom, , dow] = parts;

    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;

    if (dom === '*' && dow === '*') return `Daily at ${time}`;
    if (dom === '*' && dow === '1-5') return `Weekdays at ${time}`;
    if (dom === '*' && dow === '1') return `Every Monday at ${time}`;
    if (dom === '*' && dow === '5') return `Every Friday at ${time}`;
    if (dom === '1' && dow === '*') return `1st of month at ${time}`;

    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (dom === '*' && /^\d$/.test(dow)) {
      return `Every ${dowNames[parseInt(dow, 10)] || dow} at ${time}`;
    }

    // Step patterns
    if (hour.includes('/')) return `Every ${hour.split('/')[1]}h`;

    return cron; // fallback
  } catch {
    return cron;
  }
}

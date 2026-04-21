import { describe, test, expect } from 'vitest';
import {
  validateSettingsPatch,
  validateHttpUrl,
} from '@/lib/agency/settings-validator';

// ═══════════════════════════════════════════════════════════════════════════
// validateHttpUrl
// ═══════════════════════════════════════════════════════════════════════════
describe('validateHttpUrl', () => {
  test('accepts https URLs', () => {
    expect(validateHttpUrl('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    );
  });

  test('accepts http URLs', () => {
    expect(validateHttpUrl('http://localhost:3001/x.png')).toBe(
      'http://localhost:3001/x.png',
    );
  });

  test('rejects file:// URLs (main bug we saw in the screenshot)', () => {
    expect(validateHttpUrl('file:///C:/Users/foo/logo.png')).toBeNull();
  });

  test('rejects data: URIs', () => {
    expect(validateHttpUrl('data:image/png;base64,AAAA')).toBeNull();
  });

  test('rejects javascript: URIs', () => {
    expect(validateHttpUrl('javascript:alert(1)')).toBeNull();
  });

  test('rejects bare strings', () => {
    expect(validateHttpUrl('not a url')).toBeNull();
    expect(validateHttpUrl('')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — logo_url
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: logo_url', () => {
  test('accepts + normalizes a valid URL', () => {
    const r = validateSettingsPatch({ logo_url: '  https://x.com/l.png  ' }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates.logo_url).toBe('https://x.com/l.png');
  });

  test('empty string signals delete', () => {
    const r = validateSettingsPatch({ logo_url: '' }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates).toHaveProperty('logo_url', undefined);
  });

  test('rejects file:// URLs', () => {
    const r = validateSettingsPatch({ logo_url: 'file:///C:/logo.png' }, 'pro');
    expect(r.error).toMatch(/http\(s\) URL/);
  });

  test('rejects non-string', () => {
    const r = validateSettingsPatch({ logo_url: 123 }, 'pro');
    expect(r.error).toMatch(/string/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — colors
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: colors', () => {
  test('accepts valid 6-digit hex', () => {
    const r = validateSettingsPatch(
      { primary_color: '#8b5cf6', accent_color: '#6366f1' },
      'pro',
    );
    expect(r.error).toBeUndefined();
    expect(r.updates.primary_color).toBe('#8b5cf6');
    expect(r.updates.accent_color).toBe('#6366f1');
  });

  test('accepts 3-digit hex shorthand', () => {
    const r = validateSettingsPatch({ primary_color: '#f0c' }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates.primary_color).toBe('#f0c');
  });

  test('normalizes to lowercase', () => {
    const r = validateSettingsPatch({ primary_color: '#ABCDEF' }, 'pro');
    expect(r.updates.primary_color).toBe('#abcdef');
  });

  test('rejects missing hash', () => {
    const r = validateSettingsPatch({ primary_color: '8b5cf6' }, 'pro');
    expect(r.error).toMatch(/hex color/);
  });

  test('rejects CSS color names', () => {
    const r = validateSettingsPatch({ primary_color: 'red' }, 'pro');
    expect(r.error).toMatch(/hex color/);
  });

  test('empty string signals delete', () => {
    const r = validateSettingsPatch({ accent_color: '' }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates).toHaveProperty('accent_color', undefined);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — support_email
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: support_email', () => {
  test('accepts + normalizes lowercase', () => {
    const r = validateSettingsPatch({ support_email: 'Hello@Example.com' }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates.support_email).toBe('hello@example.com');
  });

  test('rejects malformed email', () => {
    const r = validateSettingsPatch({ support_email: 'not-an-email' }, 'pro');
    expect(r.error).toMatch(/valid email/);
  });

  test('rejects email without domain', () => {
    const r = validateSettingsPatch({ support_email: 'foo@bar' }, 'pro');
    expect(r.error).toMatch(/valid email/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — company_name
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: company_name', () => {
  test('accepts + trims', () => {
    const r = validateSettingsPatch({ company_name: '  Acme Co.  ' }, 'pro');
    expect(r.updates.company_name).toBe('Acme Co.');
  });

  test('rejects > 100 chars', () => {
    const r = validateSettingsPatch({ company_name: 'x'.repeat(101) }, 'pro');
    expect(r.error).toMatch(/100/);
  });

  test('allows 100 chars exactly', () => {
    const r = validateSettingsPatch({ company_name: 'x'.repeat(100) }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates.company_name).toBe('x'.repeat(100));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — show_powered_by PLAN GATE (security-critical)
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: show_powered_by plan gate', () => {
  test('Pro plan can HIDE the badge', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates.show_powered_by).toBe(false);
  });

  test('Scale plan can HIDE the badge', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'scale');
    expect(r.updates.show_powered_by).toBe(false);
  });

  test('Free plan CANNOT hide the badge — silently ignored', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'free');
    expect(r.error).toBeUndefined();
    expect(r.updates).not.toHaveProperty('show_powered_by');
  });

  test('Solo Pro plan CANNOT hide the badge — silently ignored', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'solo_pro');
    expect(r.updates).not.toHaveProperty('show_powered_by');
  });

  test('Starter/Lite plan CANNOT hide the badge — silently ignored', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'starter');
    expect(r.updates).not.toHaveProperty('show_powered_by');
  });

  test('Beta plan CANNOT hide the badge', () => {
    const r = validateSettingsPatch({ show_powered_by: false }, 'beta');
    expect(r.updates).not.toHaveProperty('show_powered_by');
  });

  test('Any plan can SHOW the badge (true)', () => {
    for (const plan of ['free', 'solo_pro', 'starter', 'pro', 'scale', 'beta']) {
      const r = validateSettingsPatch({ show_powered_by: true }, plan);
      expect(r.error).toBeUndefined();
      expect(r.updates.show_powered_by).toBe(true);
    }
  });

  test('rejects non-boolean values', () => {
    const r = validateSettingsPatch({ show_powered_by: 'true' }, 'pro');
    expect(r.error).toMatch(/boolean/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — unknown keys are dropped (allowlist behavior)
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: unknown keys', () => {
  test('drops keys we do not know about', () => {
    const r = validateSettingsPatch(
      { malicious: 'DROP TABLE users', company_name: 'OK' },
      'pro',
    );
    expect(r.error).toBeUndefined();
    expect(r.updates).not.toHaveProperty('malicious');
    expect(r.updates.company_name).toBe('OK');
  });

  test('empty input returns empty updates', () => {
    const r = validateSettingsPatch({}, 'pro');
    expect(r.error).toBeUndefined();
    expect(r.updates).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSettingsPatch — combined happy path
// ═══════════════════════════════════════════════════════════════════════════
describe('validateSettingsPatch: full happy path', () => {
  test('Pro plan full branding update', () => {
    const r = validateSettingsPatch(
      {
        logo_url: 'https://cdn.example.com/logo.png',
        primary_color: '#8b5cf6',
        accent_color: '#6366f1',
        company_name: 'My Agency',
        support_email: 'help@myagency.com',
        show_powered_by: false,
      },
      'pro',
    );
    expect(r.error).toBeUndefined();
    expect(r.updates).toEqual({
      logo_url: 'https://cdn.example.com/logo.png',
      primary_color: '#8b5cf6',
      accent_color: '#6366f1',
      company_name: 'My Agency',
      support_email: 'help@myagency.com',
      show_powered_by: false,
    });
  });
});

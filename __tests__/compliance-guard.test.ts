import { describe, it, expect } from 'vitest';
import { isStopReply, isStartReply } from '@/lib/sms/compliance-guard';

describe('isStopReply', () => {
  it('recognizes all canonical TCPA stop keywords', () => {
    expect(isStopReply('STOP')).toBe(true);
    expect(isStopReply('stop')).toBe(true);
    expect(isStopReply('Stop')).toBe(true);
    expect(isStopReply('UNSUBSCRIBE')).toBe(true);
    expect(isStopReply('unsubscribe')).toBe(true);
    expect(isStopReply('CANCEL')).toBe(true);
    expect(isStopReply('cancel')).toBe(true);
    expect(isStopReply('END')).toBe(true);
    expect(isStopReply('QUIT')).toBe(true);
    expect(isStopReply('STOPALL')).toBe(true);
  });

  it('tolerates whitespace around keywords', () => {
    expect(isStopReply('  STOP  ')).toBe(true);
    expect(isStopReply('\nunsubscribe\n')).toBe(true);
  });

  it('does NOT match keywords embedded in sentences', () => {
    // Per TCPA, only exact/whitespace-trimmed keywords trigger opt-out.
    expect(isStopReply('stop sending')).toBe(false);
    expect(isStopReply('please cancel my order')).toBe(false);
    expect(isStopReply('where is my order? stop it')).toBe(false);
    expect(isStopReply('I need to stop using this')).toBe(false);
  });

  it('rejects unrelated messages', () => {
    expect(isStopReply('where is my order?')).toBe(false);
    expect(isStopReply('can I change my address')).toBe(false);
    expect(isStopReply('')).toBe(false);
    expect(isStopReply('yes')).toBe(false);
  });
});

describe('isStartReply', () => {
  it('recognizes canonical opt-in keywords', () => {
    expect(isStartReply('START')).toBe(true);
    expect(isStartReply('start')).toBe(true);
    expect(isStartReply('UNSTOP')).toBe(true);
    expect(isStartReply('YES')).toBe(true);
    expect(isStartReply('SUBSCRIBE')).toBe(true);
  });

  it('does NOT match ambiguous affirmations', () => {
    // "yeah" or "sure" is not a TCPA-grade opt-in.
    expect(isStartReply('yeah')).toBe(false);
    expect(isStartReply('sure')).toBe(false);
    expect(isStartReply('ok')).toBe(false);
  });

  it('does NOT match embedded words', () => {
    expect(isStartReply('yes please')).toBe(false);
    expect(isStartReply('start sending me updates')).toBe(false);
  });
});

describe('STOP vs START exclusivity', () => {
  it('no keyword is both a stop and a start', () => {
    const stopWords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL'];
    const startWords = ['START', 'UNSTOP', 'YES', 'SUBSCRIBE'];

    for (const w of stopWords) {
      expect(isStopReply(w)).toBe(true);
      expect(isStartReply(w)).toBe(false);
    }
    for (const w of startWords) {
      expect(isStartReply(w)).toBe(true);
      expect(isStopReply(w)).toBe(false);
    }
  });
});

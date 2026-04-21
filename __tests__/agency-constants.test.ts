import { describe, test, expect } from 'vitest';
import {
  MASTER_AGENCY_ID,
  ADVANCED_TABS_AGENCIES,
  DISPATCH_AGENCIES,
  isMasterAgency,
  hasAdvancedTabs,
  hasDispatchTab,
} from '@/lib/agency/constants';

describe('agency constants — defaults', () => {
  test('MASTER_AGENCY_ID resolves to ConversionSystem UUID', () => {
    expect(MASTER_AGENCY_ID).toBeTruthy();
    expect(typeof MASTER_AGENCY_ID).toBe('string');
    expect(MASTER_AGENCY_ID).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('ADVANCED_TABS_AGENCIES includes the master', () => {
    expect(ADVANCED_TABS_AGENCIES).toContain(MASTER_AGENCY_ID.toLowerCase());
  });

  test('DISPATCH_AGENCIES includes the master', () => {
    expect(DISPATCH_AGENCIES).toContain(MASTER_AGENCY_ID.toLowerCase());
  });

  test('lists are frozen (immutable)', () => {
    expect(() => {
      (ADVANCED_TABS_AGENCIES as unknown as string[]).push('sneaky-uuid');
    }).toThrow();
  });
});

describe('isMasterAgency', () => {
  test('returns true for the master UUID', () => {
    expect(isMasterAgency(MASTER_AGENCY_ID)).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(isMasterAgency(MASTER_AGENCY_ID.toUpperCase())).toBe(true);
  });

  test('returns false for null/undefined/empty', () => {
    expect(isMasterAgency(null)).toBe(false);
    expect(isMasterAgency(undefined)).toBe(false);
    expect(isMasterAgency('')).toBe(false);
  });

  test('returns false for a non-master UUID', () => {
    expect(isMasterAgency('00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});

describe('hasAdvancedTabs — plan-gate security check', () => {
  test('master agency passes', () => {
    expect(hasAdvancedTabs(MASTER_AGENCY_ID)).toBe(true);
  });

  test('allowlisted non-master (TrustedNetworx) passes', () => {
    expect(hasAdvancedTabs('18e6e562-ec29-4652-a38b-58f6be2e533f')).toBe(true);
  });

  test('allowlisted Priv7 (Purple Lotus) passes', () => {
    expect(hasAdvancedTabs('13cc47bc-88bb-4ef8-84e8-f2c0cd97fd3e')).toBe(true);
  });

  test('unknown agency fails (the critical bypass case)', () => {
    expect(hasAdvancedTabs('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  test('null/undefined/empty fails closed', () => {
    expect(hasAdvancedTabs(null)).toBe(false);
    expect(hasAdvancedTabs(undefined)).toBe(false);
    expect(hasAdvancedTabs('')).toBe(false);
  });

  test('case-insensitive match', () => {
    expect(hasAdvancedTabs(MASTER_AGENCY_ID.toUpperCase())).toBe(true);
  });
});

describe('hasDispatchTab — Onfleet gate', () => {
  test('master agency passes', () => {
    expect(hasDispatchTab(MASTER_AGENCY_ID)).toBe(true);
  });

  test('allowlisted Priv7 (Purple Lotus, cannabis delivery) passes', () => {
    expect(hasDispatchTab('13cc47bc-88bb-4ef8-84e8-f2c0cd97fd3e')).toBe(true);
  });

  test('TrustedNetworx NOT in dispatch allowlist', () => {
    // Deliberately different from advanced-tabs — dispatch is a narrower gate
    expect(hasDispatchTab('18e6e562-ec29-4652-a38b-58f6be2e533f')).toBe(false);
  });

  test('unknown agency fails', () => {
    expect(hasDispatchTab('00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  test('null/empty fails closed', () => {
    expect(hasDispatchTab(null)).toBe(false);
    expect(hasDispatchTab('')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { DISPATCH_TOOLS, getToolRisk } from '@/lib/onfleet/tools';

describe('DISPATCH_TOOLS catalog', () => {
  it('has at least the 13 tools the dispatch agents require', () => {
    const names = DISPATCH_TOOLS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining([
      'list_active_tasks',
      'list_active_drivers',
      'get_task',
      'assign_task',
      'update_deadline',
      'trigger_optimize',
      'flag_sla_risk',
      'read_customer_memory',
      'read_order_status',
      'read_last_sms',
      'send_customer_sms',
      'escalate_to_human',
      'update_customer_memory',
    ]));
  });

  it('every tool has a description, name, and valid input_schema', () => {
    for (const tool of DISPATCH_TOOLS) {
      expect(tool.name, `tool name`).toMatch(/^[a-z_]+$/);
      const description = tool.description;
      expect(description, `${tool.name} description`).toBeTruthy();
      expect(description!.length, `${tool.name} description`).toBeGreaterThan(20);
      expect(tool.input_schema, `${tool.name} schema`).toBeDefined();
      expect(tool.input_schema.type, `${tool.name} schema.type`).toBe('object');
    }
  });

  it('write tools require a `reason` parameter (forces LLM to explain)', () => {
    const writesRequiringReason = [
      'assign_task',
      'update_deadline',
      'trigger_optimize',
      'flag_sla_risk',
    ];
    for (const name of writesRequiringReason) {
      const tool = DISPATCH_TOOLS.find((t) => t.name === name);
      expect(tool, name).toBeDefined();
      const required = tool!.input_schema.required as string[] | undefined;
      expect(required, `${name}.required`).toContain('reason');
    }
  });

  it('no tool has duplicate names', () => {
    const names = DISPATCH_TOOLS.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe('getToolRisk', () => {
  it('classifies reads as low-risk', () => {
    expect(getToolRisk('list_active_tasks')).toBe('low');
    expect(getToolRisk('list_active_drivers')).toBe('low');
    expect(getToolRisk('get_task')).toBe('low');
    expect(getToolRisk('read_customer_memory')).toBe('low');
    expect(getToolRisk('read_order_status')).toBe('low');
    expect(getToolRisk('read_last_sms')).toBe('low');
  });

  it('classifies blast-radius writes as high-risk', () => {
    // Customer-visible reassignment + route-wide rebalancing.
    expect(getToolRisk('assign_task')).toBe('high');
    expect(getToolRisk('trigger_optimize')).toBe('high');
  });

  it('classifies customer SMS as medium-risk (compliance-guarded separately)', () => {
    expect(getToolRisk('send_customer_sms')).toBe('medium');
    expect(getToolRisk('update_deadline')).toBe('medium');
  });

  it('treats non-destructive flag/escalate as low-risk', () => {
    expect(getToolRisk('flag_sla_risk')).toBe('low');
    expect(getToolRisk('escalate_to_human')).toBe('low');
    expect(getToolRisk('update_customer_memory')).toBe('low');
  });

  it('defaults unknown tools to medium (safer default)', () => {
    expect(getToolRisk('totally_made_up')).toBe('medium');
  });
});

/**
 * template-builder.ts
 *
 * Converts agency "Quick Answers" config into router template trigger→response pairs.
 * Templates are answered at Tier-0 ($0) by kyra-router — no API call, no credit cost.
 */

export interface QuickAnswers {
  hours?: string;
  address?: string;
  services?: string;
  pricing?: string;
  custom?: Array<{ trigger: string; response: string }>;
}

export function buildTemplatesFromQuickAnswers(qa: QuickAnswers): Record<string, string> {
  const t: Record<string, string> = {};

  if (qa.hours) {
    t['what are your hours']          = qa.hours;
    t['when are you open']            = qa.hours;
    t['business hours']               = qa.hours;
    t['what time do you open']        = qa.hours;
    t['what time do you close']       = qa.hours;
    t['are you open']                 = qa.hours;
  }

  if (qa.address) {
    t['where are you located']        = qa.address;
    t['what is your address']         = qa.address;
    t['where is your office']         = qa.address;
    t['where are you based']          = qa.address;
  }

  if (qa.services) {
    t['what services do you offer']   = qa.services;
    t['what do you do']               = qa.services;
    t['what can you help with']       = qa.services;
    t['what do you offer']            = qa.services;
    t['what do you specialize in']    = qa.services;
  }

  if (qa.pricing) {
    t['how much does it cost']        = qa.pricing;
    t['what are your prices']         = qa.pricing;
    t['how much is it']               = qa.pricing;
    t['what are your rates']          = qa.pricing;
    t['how much do you charge']       = qa.pricing;
    t['what does it cost']            = qa.pricing;
  }

  if (qa.custom) {
    for (const { trigger, response } of qa.custom) {
      if (trigger?.trim() && response?.trim()) {
        t[trigger.toLowerCase().trim()] = response.trim();
      }
    }
  }

  return t;
}

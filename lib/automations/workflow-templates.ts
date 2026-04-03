/**
 * Pre-built Workflow Templates
 *
 * One-click starting points. Users can customize after generation.
 */

import type { WorkflowTemplate } from './workflow-types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome-new-lead',
    name: 'Welcome New Lead',
    description: 'When a new lead comes in, send a welcome message immediately, then follow up in 2 days if no reply.',
    category: 'Lead Nurture',
    trigger: { type: 'new_lead' },
    steps: [
      {
        type: 'send_sms',
        message: 'Hi {{contact_name}}! Thanks for reaching out to {{business_name}}. How can we help you today?',
      },
      { type: 'wait', minutes: 2880 },
      {
        type: 'condition',
        if: 'no_reply',
        then: [
          {
            type: 'send_sms',
            message: 'Hi {{contact_name}}, just checking in! Let us know if you have any questions — we\'re here to help.',
          },
        ],
      },
    ],
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    description: 'Send a reminder 24 hours before a booked appointment, then a day-of confirmation.',
    category: 'Appointments',
    trigger: { type: 'booking_created' },
    steps: [
      {
        type: 'send_sms',
        message: 'Hi {{contact_name}}! Your appointment with {{business_name}} is confirmed. We\'ll send you a reminder before your visit!',
      },
      { type: 'add_tag', tag: 'appointment-booked' },
      { type: 'wait', minutes: 1320 }, // 22 hours — reminder ~2h before 24h mark
      {
        type: 'send_sms',
        message: 'Reminder: Your appointment with {{business_name}} is tomorrow! Reply YES to confirm or let us know if you need to reschedule.',
      },
    ],
  },
  {
    id: 'follow-up-sequence',
    name: 'Follow-Up Sequence',
    description: 'When a lead goes quiet, send a friendly check-in after 2 days, then a final nudge after 5 days.',
    category: 'Lead Nurture',
    trigger: { type: 'no_reply', after_hours: 48 },
    steps: [
      {
        type: 'ai_respond',
        prompt: 'Send a casual, friendly follow-up. Reference their last interaction if possible. Ask a simple question to restart the conversation. Keep it under 2 sentences.',
      },
      { type: 'wait', minutes: 4320 }, // 3 more days
      {
        type: 'condition',
        if: 'no_reply',
        then: [
          {
            type: 'send_sms',
            message: 'Hi {{contact_name}}, I know you\'re busy! Just wanted to make sure you got my message. If now isn\'t the right time, no worries — just let me know. 🙂',
          },
          { type: 'add_tag', tag: 'needs-attention' },
        ],
      },
    ],
  },
  {
    id: 're-engagement',
    name: 'Re-Engagement Campaign',
    description: 'Reach out to cold leads who haven\'t responded in 7 days with a value-first message.',
    category: 'Lead Nurture',
    trigger: { type: 'no_reply', after_hours: 168 },
    steps: [
      {
        type: 'ai_respond',
        prompt: 'Send a re-engagement message. Don\'t be salesy. Offer something of value — a tip, insight, or helpful resource related to their interest. Keep it warm and brief.',
      },
      { type: 'wait', minutes: 10080 }, // 7 days
      {
        type: 'condition',
        if: 'no_reply',
        then: [
          { type: 'add_tag', tag: 'cold-lead' },
          { type: 'move_deal', stage: 'Cold' },
        ],
      },
    ],
  },
  {
    id: 'pricing-escalation',
    name: 'Pricing Question Escalation',
    description: 'When a customer mentions pricing, notify the team immediately for a personal touch.',
    category: 'Escalation',
    trigger: { type: 'message_received', filter: 'pricing' },
    steps: [
      {
        type: 'ai_respond',
        prompt: 'Acknowledge their interest in pricing. Let them know someone from the team will follow up shortly with personalized pricing details. Be warm and professional.',
      },
      { type: 'escalate', reason: 'Customer asked about pricing — needs personal follow-up' },
      { type: 'add_tag', tag: 'pricing-inquiry' },
    ],
  },
  {
    id: 'deal-won-celebration',
    name: 'Deal Won Follow-Up',
    description: 'When a deal is won, send a thank-you and ask for a review after 3 days.',
    category: 'Post-Sale',
    trigger: { type: 'deal_stage_changed', to_stage: 'Won' },
    steps: [
      {
        type: 'send_sms',
        message: 'Welcome to the {{business_name}} family, {{contact_name}}! 🎉 We\'re thrilled to have you. If you need anything at all, just reach out!',
      },
      { type: 'add_tag', tag: 'customer' },
      { type: 'wait', minutes: 4320 }, // 3 days
      {
        type: 'send_sms',
        message: 'Hi {{contact_name}}! How\'s everything going? If you\'re happy with your experience, we\'d love a quick review — it means the world to us! ⭐',
      },
    ],
  },
  {
    id: 'weekly-digest',
    name: 'Weekly Activity Digest',
    description: 'Every Monday at 9am, compile and send a summary of the week\'s activity.',
    category: 'Reporting',
    trigger: { type: 'schedule', cron: '0 9 * * 1' },
    steps: [
      {
        type: 'ai_respond',
        prompt: 'Generate a weekly activity digest summarizing: new leads, conversations handled, appointments booked, deals moved. Format it as a brief, scannable report. Send to the agency owner.',
      },
    ],
  },
];

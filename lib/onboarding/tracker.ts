import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ============================================================================
// Onboarding Step Definitions
// ============================================================================

export type OnboardingStepKey =
  | 'profile_completed'
  | 'first_client_created'
  | 'first_container_provisioned'
  | 'stripe_connected'
  | 'ghl_connected'
  | 'first_message_sent';

export interface OnboardingStepMeta {
  key: OnboardingStepKey;
  label: string;
  description: string;
  order: number;
  href: string;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { key: 'profile_completed', label: 'Set up your profile', description: 'Add your agency name and branding', order: 1, href: '/agency/settings' },
  { key: 'first_client_created', label: 'Create your first client', description: 'Add an AI worker for a client', order: 2, href: '/agency/clients/new' },
  { key: 'first_container_provisioned', label: 'AI worker deployed', description: 'Your first AI worker is live', order: 3, href: '/agency/clients' },
  { key: 'ghl_connected', label: 'Connect GoHighLevel', description: 'Link a GHL sub-account for SMS/email', order: 4, href: '/agency/ghl-setup' },
  { key: 'first_message_sent', label: 'Send first message', description: 'Test your AI worker in the Chat tab', order: 5, href: '/agency/clients' },
];

// ============================================================================
// Step Data Shape (stored in agencies.onboarding_steps JSONB)
// ============================================================================

export interface OnboardingStepData {
  completed: boolean;
  completed_at: string;
}

export type OnboardingStepsRecord = Partial<Record<OnboardingStepKey, OnboardingStepData>>;

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Mark an onboarding step as completed for an agency.
 * Idempotent — won't overwrite if already completed.
 */
export async function markOnboardingStep(agencyId: string, step: OnboardingStepKey): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  // Fetch current steps
  const { data: agency, error: fetchError } = await supabase
    .from('agencies')
    .select('onboarding_steps')
    .eq('id', agencyId)
    .single();

  if (fetchError || !agency) {
    console.error('[onboarding] Failed to fetch agency for step tracking:', fetchError);
    return;
  }

  const steps = (agency.onboarding_steps ?? {}) as OnboardingStepsRecord;

  // Don't overwrite if already completed
  if (steps[step]?.completed) return;

  const updated: OnboardingStepsRecord = {
    ...steps,
    [step]: { completed: true, completed_at: new Date().toISOString() },
  };

  const { error: updateError } = await supabase
    .from('agencies')
    .update({ onboarding_steps: updated })
    .eq('id', agencyId);

  if (updateError) {
    console.error(`[onboarding] Failed to mark step "${step}" for agency ${agencyId}:`, updateError);
  }
}

/**
 * Get onboarding progress for an agency.
 */
export async function getOnboardingProgress(agencyId: string) {
  const supabase = createServiceClientWithoutCookies();

  const { data: agency, error } = await supabase
    .from('agencies')
    .select('onboarding_steps')
    .eq('id', agencyId)
    .single();

  if (error || !agency) return { steps: {} as OnboardingStepsRecord, completedCount: 0, totalSteps: ONBOARDING_STEPS.length, percentComplete: 0 };

  const steps = (agency.onboarding_steps ?? {}) as OnboardingStepsRecord;
  const completedCount = ONBOARDING_STEPS.filter(s => steps[s.key]?.completed).length;

  return {
    steps,
    completedCount,
    totalSteps: ONBOARDING_STEPS.length,
    percentComplete: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
  };
}

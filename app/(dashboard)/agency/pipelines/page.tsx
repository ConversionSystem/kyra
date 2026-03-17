import { redirect } from 'next/navigation';

// Pipelines merged into Proactive AI (automations).
// Visual pipeline builder was UI-only with no execution engine.
export default function PipelinesPage() {
  redirect('/agency/automations');
}

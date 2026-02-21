import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { ExternalLink, ArrowRight, Copy, CheckCircle2, AlertCircle, Info, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function GHLSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <h1 className="text-2xl font-bold text-gray-900">GHL Integration Setup</h1>
          <Badge className="bg-green-100 text-green-700 text-xs">5 min setup</Badge>
        </div>
        <p className="text-sm text-gray-500">
          Connect any GHL sub-account to a Kyra AI employee using a Private Integration token. 
          No GHL marketplace approval needed.
        </p>
      </div>

      {/* Why Private Integration */}
      <div className="mb-8 rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Why Private Integration tokens?</p>
          <p className="text-sm text-indigo-700 mt-0.5">
            GHL marketplace OAuth requires approval (takes weeks). Private Integration tokens let you 
            connect immediately — no approval, no wait. You create one inside the sub-account itself.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-10">
        <h2 className="font-semibold text-gray-900">For each GHL sub-account you want to connect:</h2>

        {[
          {
            step: '1',
            title: 'Log into the GHL sub-account',
            desc: (
              <>
                Go to{' '}
                <a
                  href="https://app.gohighlevel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  app.gohighlevel.com
                  <ExternalLink className="h-3 w-3" />
                </a>
                {' '}and make sure you&apos;re in the <strong>sub-account</strong> (not the agency account). 
                Look for the location name in the top-left corner.
              </>
            ),
            note: 'Agency accounts and sub-accounts have different settings. The Private Integration setting is only in sub-accounts.',
          },
          {
            step: '2',
            title: 'Open Settings → Other Settings',
            desc: (
              <>
                In the left sidebar of the sub-account, click <strong>Settings</strong> (bottom of sidebar).
                Then click <strong>&ldquo;Other Settings&rdquo;</strong> (usually near the bottom of the settings menu).
              </>
            ),
          },
          {
            step: '3',
            title: 'Scroll to "Private Integrations"',
            desc: (
              <>
                On the Other Settings page, scroll down until you see the{' '}
                <strong>&ldquo;Private Integrations&rdquo;</strong> section. 
                Click <strong>&ldquo;Add Private Integration&rdquo;</strong>.
              </>
            ),
            note: `If you don't see "Private Integrations", your GHL plan may not include it. Contact GHL support to enable it.`,
          },
          {
            step: '4',
            title: 'Configure the integration',
            desc: (
              <ul className="space-y-1.5 mt-1 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span><strong>Name:</strong> &ldquo;Kyra AI Employee&rdquo; (or anything you prefer)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span><strong>Permissions:</strong> Enable at minimum — Contacts (read/write), Conversations (read/write), Messages (read/write)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span><strong>Locations:</strong> Select this sub-account (already selected)</span>
                </li>
              </ul>
            ),
          },
          {
            step: '5',
            title: 'Copy the token (shown once only!)',
            desc: (
              <>
                After saving, GHL will show you the token <strong>one time only</strong>. 
                Copy it immediately. Paste it into the GHL Integration field on your client&apos;s detail page in Kyra.
              </>
            ),
            isWarning: true,
            warning: "GHL does NOT show this token again. If you miss it, you'll need to delete it and create a new one.",
          },
          {
            step: '6',
            title: 'Paste the token into Kyra',
            desc: (
              <>
                In Kyra, go to your client&apos;s detail page (<Link href="/agency/clients" className="text-indigo-600 underline">Clients → [client name]</Link>), 
                find the <strong>GHL Connection</strong> section, paste the token, and click <strong>Connect</strong>.
                That&apos;s it — your AI employee can now read and send messages in that GHL sub-account.
              </>
            ),
          },
        ].map((item) => (
          <div key={item.step} className="flex gap-4">
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              item.isWarning ? 'bg-amber-100 text-amber-700' : 'bg-indigo-600 text-white'
            }`}>
              {item.step}
            </div>
            <div className="flex-1 pt-1">
              <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
              <div className="text-sm text-gray-600 leading-relaxed">{item.desc}</div>
              {item.note && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500">{item.note}</p>
                </div>
              )}
              {item.isWarning && item.warning && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{item.warning}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* What happens after connecting */}
      <Card className="mb-8 border-green-200 bg-green-50/50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            What happens after connecting
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: '💬', title: 'Incoming messages routed to AI', desc: 'Customer texts arrive in GHL → Kyra AI reads them → responds in under 60 seconds' },
              { icon: '📋', title: 'Contacts synced', desc: "Customer info written back to GHL so you don't lose any data" },
              { icon: '🔍', title: 'Full conversation log', desc: 'Every AI conversation visible in Kyra dashboard AND GHL conversations tab' },
              { icon: '🛑', title: 'Human takeover', desc: 'Your team can take over any conversation at any time — the AI automatically pauses' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="mb-8">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Common Issues</h3>
          <div className="space-y-3">
            {[
              {
                problem: '"I can\'t find Private Integrations in GHL"',
                solution: 'Make sure you\'re in the sub-account, not the agency view. Go to the location first, then Settings → Other Settings. If still missing, ask GHL support to enable Private Integrations on your plan.',
              },
              {
                problem: '"The token stopped working"',
                solution: 'GHL tokens can expire or be revoked. Go back to the sub-account, delete the old integration, create a new one, and update the token in Kyra.',
              },
              {
                problem: '"AI is receiving messages but not responding"',
                solution: 'Check that your AI employee is deployed and has a gateway status of "Live" (green dot on the clients list). If the status is offline, use the Deploy button on the client detail page.',
              },
              {
                problem: '"Messages are going to GHL but the contact info is wrong"',
                solution: 'Ensure the Contacts permission is set to read/write in your Private Integration settings in GHL.',
              },
            ].map((item) => (
              <div key={item.problem} className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900 mb-1">❓ {item.problem}</p>
                <p className="text-sm text-gray-500">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/agency/clients">
            <ArrowRight className="h-4 w-4 mr-2" />
            Go to Clients → Connect GHL
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open GHL
          </a>
        </Button>
      </div>
    </div>
  );
}

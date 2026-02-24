import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { href: '/try/dental', label: '💬 Try Live Demo' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/changelog', label: 'Changelog' },
    { href: '/vs', label: 'vs. Chatbots' },
    { href: '/roi', label: 'ROI Calculator' },
    { href: '/get-demo', label: 'Get a Demo' },
  ],
  'Live Demos': [
    { href: '/try/dental', label: '🦷 Dental AI' },
    { href: '/try/realestate', label: '🏡 Real Estate AI' },
    { href: '/try/auto', label: '🚗 Auto AI' },
    { href: '/try/cannabis', label: '🌿 Cannabis AI' },
    { href: '/try/restaurant', label: '🍽️ Restaurant AI' },
    { href: '/try/medspa', label: '✨ Med Spa AI' },
  ],
  Resources: [
    { href: '/blog', label: 'Blog' },
    { href: '/help', label: 'Help & FAQ' },
    { href: '/ghl', label: 'For GHL Agencies' },
    { href: '/zapier', label: 'Zapier Integration' },
    { href: '/ghl-snapshot', label: 'Free GHL Snapshot' },
  ],
  Company: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/signup/agency', label: 'Sign Up Free' },
    { href: '/login', label: 'Sign In' },
  ],
};

export default function PublicFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                {section}
              </h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-black text-xs text-white">
                K
              </div>
              <span className="font-bold text-sm text-gray-900">Kyra</span>
              <span className="text-gray-400 text-sm">by Conversion System</span>
            </div>
            <p className="text-xs text-gray-500">The #1 AI Workforce Platform for agencies. Deploy autonomous AI workers powered by OpenClaw.</p>
            <p className="text-xs text-indigo-500 font-medium">Powered by OpenClaw</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <p>© 2026 Conversion System. All rights reserved.</p>
            <a href="mailto:angel@conversionsystem.com" className="hover:text-gray-600 transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

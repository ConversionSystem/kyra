'use client';

import { useState } from 'react';
import { Gift, Copy, CheckCircle2, Share2 } from 'lucide-react';

interface Props {
  agencyId: string;
  referralCount: number;
  creditsEarned: number; // total bonus credits from referrals
}

export default function ReferralShareWidget({ agencyId, referralCount, creditsEarned }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const referralUrl = `https://kyra.conversionsystem.com/ref/${agencyId}`;
  const tweetText = encodeURIComponent(`I've been using Kyra AI to give my clients an AI employee that responds to leads in 60 seconds. Try it free → ${referralUrl}`);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-purple-50/50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-900">Refer an agency → earn 500 credits ($5)</p>
          <p className="text-xs text-gray-500">
            {referralCount === 0
              ? 'Share your link. Every signup = 500 bonus credits for you.'
              : `${referralCount} referral${referralCount !== 1 ? 's' : ''} · ${creditsEarned.toLocaleString()} credits earned`}
          </p>
        </div>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-purple-100 pt-3">
          {/* Referral link */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Your referral link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700 font-mono truncate">
                {referralUrl}
              </code>
              <button
                onClick={copy}
                className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 transition flex items-center gap-1.5 text-xs font-semibold"
              >
                {copied
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2 flex-wrap">
            <a
              href={`https://twitter.com/intent/tweet?text=${tweetText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <Share2 className="h-3 w-3" /> Share on X
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Share2 className="h-3 w-3" /> LinkedIn
            </a>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition"
            >
              <Copy className="h-3 w-3" /> Copy link
            </button>
          </div>

          {/* How it works */}
          <div className="bg-white/60 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-800 mb-1">How it works</p>
            <p>Share your link → they sign up → you instantly get <strong>500 bonus credits ($5)</strong>. No limit on referrals.</p>
            <a href="/agency/referrals" className="text-purple-600 font-semibold hover:underline mt-1 inline-block">
              View all referrals →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

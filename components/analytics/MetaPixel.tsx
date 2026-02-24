'use client';

import Script from 'next/script';

const PIXEL_ID = '735277348604833';

// ─── Base Pixel (loads on every page) ────────────────────────────────────────
export function MetaPixelBase() {
  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// ─── Event helpers (call from client components) ─────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params);
  }
}

// Standard events
export const pixel = {
  /** Fire when a lead form is submitted or signup initiated */
  lead: (params?: Record<string, unknown>) => track('Lead', params),

  /** Fire when registration / account creation is complete */
  completeRegistration: (params?: Record<string, unknown>) =>
    track('CompleteRegistration', params),

  /** Fire when a purchase is completed (credit pack, plan upgrade) */
  purchase: (value: number, currency = 'USD', params?: Record<string, unknown>) =>
    track('Purchase', { value, currency, ...params }),

  /** Fire when checkout flow is initiated */
  initiateCheckout: (params?: Record<string, unknown>) =>
    track('InitiateCheckout', params),

  /** Fire on key landing pages (e.g. /india, /ghl-marketplace) */
  viewContent: (contentName: string, params?: Record<string, unknown>) =>
    track('ViewContent', { content_name: contentName, ...params }),

  /** Fire when someone adds payment info */
  addPaymentInfo: (params?: Record<string, unknown>) =>
    track('AddPaymentInfo', params),

  /** Fire on /try/* demo pages — indicates high intent */
  search: (searchString: string) => track('Search', { search_string: searchString }),

  /** Custom event — track promo code redemptions */
  promoRedeemed: (code: string) =>
    track('PromoRedeemed', { content_name: code }),
};

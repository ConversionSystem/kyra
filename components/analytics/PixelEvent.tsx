'use client';

import { useEffect } from 'react';
import { pixel } from './MetaPixel';

/**
 * Drop this into any server page to fire a pixel event on mount.
 * Example: <PixelEvent event="ViewContent" params={{ content_name: 'India Landing' }} />
 */
export function PixelEvent({
  event,
  params,
}: {
  event: 'ViewContent' | 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'Purchase';
  params?: Record<string, unknown>;
}) {
  useEffect(() => {
    switch (event) {
      case 'ViewContent':
        pixel.viewContent((params?.content_name as string) ?? 'Page', params);
        break;
      case 'Lead':
        pixel.lead(params);
        break;
      case 'CompleteRegistration':
        pixel.completeRegistration(params);
        break;
      case 'InitiateCheckout':
        pixel.initiateCheckout(params);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

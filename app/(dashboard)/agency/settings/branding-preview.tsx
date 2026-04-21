'use client';

import { ImageIcon } from 'lucide-react';

interface BrandingPreviewProps {
  logoUrl: string;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  /** Agency's display name. Used as fallback when companyName is empty —
   * matches the runtime behavior in agency-sidebar.tsx + the widget script. */
  agencyName: string;
}

/**
 * Live branding preview card — shows how the agency branding will appear
 * to clients. Updates in real-time as the user edits settings.
 */
export function BrandingPreview({
  logoUrl,
  companyName,
  primaryColor,
  accentColor,
  agencyName,
}: BrandingPreviewProps) {
  const displayName = companyName.trim() || agencyName.trim() || 'Your Brand';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Mini sidebar preview */}
      <div className="flex h-48">
        {/* Simulated sidebar */}
        <div
          className="w-24 flex flex-col items-center pt-4 px-2 gap-3 shrink-0"
          style={{ backgroundColor: primaryColor || '#8b5cf6' }}
        >
          {/* Logo / placeholder */}
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-white/80 text-sm font-bold">
                {displayName[0]?.toUpperCase() ?? 'K'}
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/90 font-medium text-center truncate w-full">
            {displayName}
          </span>

          {/* Fake nav items */}
          <div className="flex flex-col gap-1.5 w-full mt-1">
            <div
              className="h-5 rounded px-2 flex items-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
            >
              <div className="h-2 w-2 rounded-sm bg-white/80 mr-1.5" />
              <div className="h-1.5 w-8 rounded-full bg-white/70" />
            </div>
            <div className="h-5 rounded px-2 flex items-center">
              <div className="h-2 w-2 rounded-sm bg-white/40 mr-1.5" />
              <div className="h-1.5 w-10 rounded-full bg-white/30" />
            </div>
            <div className="h-5 rounded px-2 flex items-center">
              <div className="h-2 w-2 rounded-sm bg-white/40 mr-1.5" />
              <div className="h-1.5 w-7 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Simulated content area */}
        <div className="flex-1 bg-gray-50 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2.5 w-20 rounded-full bg-gray-300" />
          </div>

          {/* Chat bubbles */}
          <div className="space-y-2">
            <div className="flex justify-end">
              <div
                className="h-5 rounded-lg px-3 flex items-center"
                style={{ backgroundColor: accentColor || '#6366f1' }}
              >
                <div className="h-1.5 w-12 rounded-full bg-white/70" />
              </div>
            </div>
            <div className="flex">
              <div className="h-5 rounded-lg bg-white border border-gray-200 px-3 flex items-center">
                <div className="h-1.5 w-16 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="h-5 rounded-lg px-3 flex items-center"
                style={{ backgroundColor: accentColor || '#6366f1' }}
              >
                <div className="h-1.5 w-8 rounded-full bg-white/70" />
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="mt-3 h-6 rounded-md border border-gray-200 bg-white flex items-center px-2">
            <div className="h-1.5 w-16 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Color swatches footer */}
      <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="h-4 w-4 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: primaryColor || '#8b5cf6' }}
            />
            <span className="text-[10px] text-gray-500 font-mono">
              {primaryColor || '#8b5cf6'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-4 w-4 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: accentColor || '#6366f1' }}
            />
            <span className="text-[10px] text-gray-500 font-mono">
              {accentColor || '#6366f1'}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">Live Preview</span>
      </div>
    </div>
  );
}

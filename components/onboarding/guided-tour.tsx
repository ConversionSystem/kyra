'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  id: string;
  title: string;
  description: string;
  route: string;
  highlight?: string; // CSS selector to highlight
  position: 'center' | 'bottom-right' | 'top-right';
  emoji: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Kyra! 🎉',
    description: 'You\'re about to deploy a complete Business in a Box for your first client — a live SEO website, an AI worker, and a CRM. It takes about 10 minutes. Let\'s go.',
    route: '/agency',
    position: 'center',
    emoji: '👋',
  },
  {
    id: 'website-builder',
    title: 'Build the Website First',
    description: 'The Website Builder creates 15-25 SEO-optimized pages for your client in minutes. Answer 5 questions about the business — Kyra handles the rest.',
    route: '/agency/website/create',
    position: 'center',
    emoji: '🌐',
  },
  {
    id: 'ai-worker',
    title: 'The AI Worker is Auto-Trained',
    description: 'Once the site is live, the AI chat widget is automatically trained on your client\'s content. It answers questions, captures leads, and books appointments 24/7 — no setup needed.',
    route: '/agency',
    position: 'bottom-right',
    emoji: '🤖',
  },
  {
    id: 'crm',
    title: 'Every Lead Goes to the CRM',
    description: 'Every visitor who fills out a form or chats with the AI lands in the CRM automatically. See contacts, conversations, and deals — all in one place.',
    route: '/agency/crm',
    position: 'bottom-right',
    emoji: '📊',
  },
  {
    id: 'conversations',
    title: 'Watch Conversations Live',
    description: 'See every chat your AI is having with your client\'s customers. Jump in at any time, review responses, and understand what customers are asking.',
    route: '/agency/conversations',
    position: 'bottom-right',
    emoji: '💬',
  },
  {
    id: 'ghl',
    title: 'Connect GoHighLevel (Optional)',
    description: 'If your client uses GHL, connect it here. The AI will reply to every SMS, email, and DM — and book appointments directly into the GHL calendar.',
    route: '/agency/clients',
    position: 'bottom-right',
    emoji: '🔗',
  },
  {
    id: 'growth',
    title: 'Grow with the Growth Engine',
    description: 'Once the site is live, the Growth Engine suggests new SEO pages based on what customers are searching for. One click to generate and publish.',
    route: '/agency',
    position: 'bottom-right',
    emoji: '📈',
  },
  {
    id: 'done',
    title: 'You\'re Ready! 🚀',
    description: 'Start with the Website Builder — your first client site will be live in minutes. Every client you add gets the same complete setup automatically.',
    route: '/agency/website/create',
    position: 'center',
    emoji: '🎯',
  },
];

const TOUR_STORAGE_KEY = 'kyra_tour_completed';
const TOUR_ACTIVE_KEY = 'kyra_tour_active';

interface GuidedTourProps {
  autoStart?: boolean;
}

export function GuidedTour({ autoStart }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (autoStart && !localStorage.getItem(TOUR_STORAGE_KEY)) {
      const timer = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(timer);
    }
    if (localStorage.getItem(TOUR_ACTIVE_KEY) === 'true') {
      const savedStep = parseInt(localStorage.getItem('kyra_tour_step') || '0');
      setStep(savedStep);
      setActive(true);
    }
  }, [autoStart]);

  useEffect(() => {
    if (active) {
      localStorage.setItem(TOUR_ACTIVE_KEY, 'true');
      localStorage.setItem('kyra_tour_step', String(step));
    }
  }, [active, step]);

  const current = TOUR_STEPS[step];

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      const nextRoute = TOUR_STEPS[nextStep].route;
      if (pathname !== nextRoute) {
        router.push(nextRoute);
      }
    } else {
      complete();
    }
  }, [step, pathname, router]);

  const prev = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      const prevRoute = TOUR_STEPS[prevStep].route;
      if (pathname !== prevRoute) {
        router.push(prevRoute);
      }
    }
  }, [step, pathname, router]);

  const complete = useCallback(() => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.removeItem(TOUR_ACTIVE_KEY);
    localStorage.removeItem('kyra_tour_step');
    router.push('/agency/website/create');
  }, [router]);

  const skip = useCallback(() => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.removeItem(TOUR_ACTIVE_KEY);
    localStorage.removeItem('kyra_tour_step');
  }, []);

  if (!active || !current) return null;

  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={skip} />

      {/* Tour Card */}
      <div className={`fixed z-[101] ${
        current.position === 'center'
          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          : 'bottom-6 right-6 sm:bottom-8 sm:right-8'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[340px] sm:w-[400px] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{current.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{current.title}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Step {step + 1} of {TOUR_STEPS.length}
                  </p>
                </div>
              </div>
              <button
                onClick={skip}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex items-center justify-between">
            <button
              onClick={skip}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={prev} className="text-xs">
                  <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
                </Button>
              )}
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                onClick={next}
              >
                {isLast ? (
                  <>
                    <Rocket className="h-3 w-3 mr-1" /> Get Started
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="h-3 w-3 ml-0.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Button to restart the tour from any page
 */
export function StartTourButton() {
  const router = useRouter();

  const startTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.setItem(TOUR_ACTIVE_KEY, 'true');
    localStorage.setItem('kyra_tour_step', '0');
    router.push('/agency');
    window.location.reload();
  };

  return (
    <button
      onClick={startTour}
      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
    >
      <Sparkles className="h-3.5 w-3.5" /> Take the Tour
    </button>
  );
}

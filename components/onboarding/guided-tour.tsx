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
    description: 'This is your command center. From here, you can manage AI workers, track conversations, and grow your business. Let me show you around.',
    route: '/agency',
    position: 'center',
    emoji: '👋',
  },
  {
    id: 'ai-setup',
    title: 'Configure Your AI',
    description: 'Pick from 15 industry templates or customize your AI\'s personality, tone, and knowledge. This is where your AI worker becomes uniquely yours.',
    route: '/agency/templates',
    position: 'bottom-right',
    emoji: '🤖',
  },
  {
    id: 'agents',
    title: 'Deploy Specialized Agents',
    description: 'Create a team of AI agents — Front Desk, Sales, Support, Collections. Each one handles their area with smart routing.',
    route: '/agency/agents',
    position: 'bottom-right',
    emoji: '👥',
  },
  {
    id: 'channels',
    title: 'Connect Your Channels',
    description: 'Wire up SMS, Telegram, WhatsApp, web chat, or GHL. Your AI responds on every channel, 24/7.',
    route: '/agency/channels',
    position: 'bottom-right',
    emoji: '📱',
  },
  {
    id: 'crm',
    title: 'Built-in CRM',
    description: 'Every lead gets tracked automatically. Contacts, deals, tasks, tags — all managed by your AI. No third-party CRM needed.',
    route: '/agency/crm',
    position: 'bottom-right',
    emoji: '📊',
  },
  {
    id: 'autopilot',
    title: 'Set It on Autopilot',
    description: 'Automatic follow-ups, appointment reminders, review requests, weekly reports. Your AI works while you sleep.',
    route: '/agency/autopilot',
    position: 'bottom-right',
    emoji: '⚡',
  },
  {
    id: 'pipelines',
    title: 'Chain Agents Together',
    description: 'Build pipelines — research → write → review → publish. Multi-step AI workflows with human review gates.',
    route: '/agency/pipelines',
    position: 'bottom-right',
    emoji: '🔗',
  },
  {
    id: 'oversight',
    title: 'Stay in Control',
    description: 'Token usage, review queues, alert rules — you always know what your AI is doing. Review any response before it sends.',
    route: '/agency/usage',
    position: 'bottom-right',
    emoji: '🛡️',
  },
  {
    id: 'done',
    title: 'You\'re Ready to Launch! 🚀',
    description: 'That\'s the full tour. Start by setting up your AI personality, connecting a channel, and watching leads roll in. Welcome to the future.',
    route: '/agency',
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
    router.push('/agency');
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

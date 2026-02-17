'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Briefcase,
  Globe,
  MessageCircle,
  Send,
  ChevronRight,
  ChevronLeft,
  Coffee,
  Shield,
  Scale,
} from 'lucide-react';

const STEPS = ['Welcome', 'Role', 'Timezone', 'Tone', 'Try it'];

type Tone = 'casual' | 'professional' | 'balanced';

const TONE_CARDS: { value: Tone; label: string; description: string; icon: typeof Coffee }[] = [
  {
    value: 'casual',
    label: 'Casual',
    description: 'Friendly & relaxed, like texting a smart friend',
    icon: Coffee,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Warm but clear — the best of both worlds',
    icon: Scale,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Polished & structured, like a trusted advisor',
    icon: Shield,
  },
];

const SAMPLE_PROMPTS = [
  'Help me plan my week',
  'Summarize the latest AI news',
  'Draft a message to my team',
  "What should I focus on today?",
];

// Common timezone display names
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Africa/Johannesburg',
  'Africa/Lagos',
];

function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const time = formatter.format(now);
    const city = tz.split('/').pop()!.replace(/_/g, ' ');
    return `${city} (${time})`;
  } catch {
    return tz;
  }
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [tone, setTone] = useState<Tone>('balanced');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setTimezone(detectTimezone());
  }, []);

  const next = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const complete = async (selectedPrompt?: string) => {
    if (completing) return;
    setCompleting(true);

    try {
      // Save profile to database
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          role: role || undefined,
          timezone,
          tone,
        }),
      });

      // Write workspace files (SOUL.md, USER.md) to R2
      await fetch('/api/kyra/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          role: role || undefined,
          timezone,
          tone,
        }),
      });

      // Navigate to chat, optionally with a starter prompt
      if (selectedPrompt) {
        router.push(`/chat?prompt=${encodeURIComponent(selectedPrompt)}`);
      } else {
        router.push('/chat');
      }
    } catch {
      setCompleting(false);
    }
  };

  const getStepTransition = (stepIndex: number) => {
    if (stepIndex === step) return 'opacity-100 translate-x-0';
    if (direction === 'forward') {
      return stepIndex < step
        ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'
        : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none';
    }
    return stepIndex > step
      ? 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
      : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-indigo-500' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        <div className="relative overflow-hidden">
          {/* Step 1: Welcome + Name */}
          <div
            className={`transition-all duration-500 ease-out ${getStepTransition(0)}`}
          >
            <Card className="border-gray-200 bg-gray-50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-2">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Hey, I&apos;m Kyra</h1>
                  <p className="text-gray-500">
                    Your personal AI assistant. Let&apos;s get to know each other.
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">
                    What should I call you?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-200 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) next();
                    }}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={next}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Role / Occupation */}
          <div
            className={`transition-all duration-500 ease-out ${getStepTransition(1)}`}
          >
            <Card className="border-gray-200 bg-gray-50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-2">
                    <Briefcase className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold">
                    {name ? `Nice to meet you, ${name}` : 'Nice to meet you'}
                  </h1>
                  <p className="text-gray-500">What do you do? This helps me tailor my responses.</p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">
                    Your role or occupation
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Marketing Manager, Student, Freelancer"
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-200 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') next();
                    }}
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={next}
                      className="text-gray-500"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={next}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Timezone */}
          <div
            className={`transition-all duration-500 ease-out ${getStepTransition(2)}`}
          >
            <Card className="border-gray-200 bg-gray-50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 mb-2">
                    <Globe className="w-8 h-8 text-amber-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Your timezone</h1>
                  <p className="text-gray-500">
                    So I know when to say good morning (and when to let you sleep).
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Auto-detected timezone display */}
                  <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatTimezoneLabel(timezone)}
                      </div>
                      <div className="text-xs text-gray-400">{timezone}</div>
                    </div>
                    <button
                      onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                      className="text-xs text-indigo-600 hover:text-indigo-600 transition-colors"
                    >
                      {showTimezoneDropdown ? 'Close' : 'Change'}
                    </button>
                  </div>

                  {/* Timezone override dropdown */}
                  {showTimezoneDropdown && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-100 divide-y divide-gray-300/50">
                      {COMMON_TIMEZONES.map((tz) => (
                        <button
                          key={tz}
                          onClick={() => {
                            setTimezone(tz);
                            setShowTimezoneDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            tz === timezone
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {formatTimezoneLabel(tz)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={next}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 4: Tone */}
          <div
            className={`transition-all duration-500 ease-out ${getStepTransition(3)}`}
          >
            <Card className="border-gray-200 bg-gray-50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-2">
                    <MessageCircle className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h1 className="text-2xl font-bold">How should I talk to you?</h1>
                  <p className="text-gray-500">Pick a vibe. You can always change this later.</p>
                </div>

                <div className="space-y-3">
                  {TONE_CARDS.map((card) => {
                    const Icon = card.icon;
                    const isSelected = tone === card.value;
                    return (
                      <button
                        key={card.value}
                        onClick={() => setTone(card.value)}
                        className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/30'
                            : 'border-gray-200 bg-gray-100 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div
                            className={`font-medium transition-colors ${
                              isSelected ? 'text-indigo-600' : 'text-gray-900'
                            }`}
                          >
                            {card.label}
                          </div>
                          <div className="text-xs text-gray-400">{card.description}</div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={next}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 5: Try it */}
          <div
            className={`transition-all duration-500 ease-out ${getStepTransition(4)}`}
          >
            <Card className="border-gray-200 bg-gray-50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 mb-2">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold">
                    {name ? `You're all set, ${name}!` : "You're all set!"}
                  </h1>
                  <p className="text-gray-500">
                    Pick a prompt to start, or jump straight in.
                  </p>
                </div>

                <div className="space-y-2">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => complete(prompt)}
                      disabled={completing}
                      className="w-full text-left rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-50"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => complete()}
                    disabled={completing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {completing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : (
                      'Get started'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

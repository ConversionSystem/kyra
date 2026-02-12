'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, MessageSquare, Calendar, Send, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const STEPS = ['Welcome', 'Channels', 'Calendar', 'Try it'];

const SAMPLE_PROMPTS = [
  "What's on my calendar today?",
  "Remind me to buy groceries at 6pm",
  "Summarize my week",
  "Set a timer for 25 minutes",
];

type Tone = 'casual' | 'professional' | 'balanced';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tone, setTone] = useState<Tone>('balanced');
  const [completing, setCompleting] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const complete = async () => {
    setCompleting(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, tone }),
      });
      router.push('/chat');
    } catch {
      setCompleting(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    complete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-violet-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        <div className="relative overflow-hidden">
          {/* Step 1: Welcome */}
          <div
            className={`transition-all duration-500 ease-out ${
              step === 0
                ? 'opacity-100 translate-x-0'
                : step > 0
                ? 'opacity-0 -translate-x-full absolute inset-0'
                : 'opacity-0 translate-x-full absolute inset-0'
            }`}
          >
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-2">
                    <Sparkles className="w-8 h-8 text-violet-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Hi, I'm Kyra</h1>
                  <p className="text-zinc-400">Your personal AI assistant. Let's get you set up.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Name your assistant (optional)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Kyra"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Communication style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['casual', 'balanced', 'professional'] as Tone[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={`rounded-lg border px-3 py-2.5 text-sm capitalize transition-all ${
                            tone === t
                              ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                              : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={next} className="text-zinc-400">
                    Skip
                  </Button>
                  <Button onClick={next} className="bg-violet-600 hover:bg-violet-500 text-white">
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Channels */}
          <div
            className={`transition-all duration-500 ease-out ${
              step === 1
                ? 'opacity-100 translate-x-0'
                : step > 1
                ? 'opacity-0 -translate-x-full absolute inset-0'
                : 'opacity-0 translate-x-full absolute inset-0'
            }`}
          >
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 mb-2">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Connect your channels</h1>
                  <p className="text-zinc-400">Chat with Kyra wherever you are</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => window.open('/settings/channels', '_blank')}
                    className="w-full flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-xl">
                      ✈️
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">Telegram</div>
                      <div className="text-xs text-zinc-500">Message Kyra from Telegram</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => window.open('/settings/channels', '_blank')}
                    className="w-full flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-xl">
                      💬
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">WhatsApp</div>
                      <div className="text-xs text-zinc-500">Coming soon</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-green-400 transition-colors" />
                  </button>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={next} className="text-zinc-400">
                      Skip
                    </Button>
                    <Button onClick={next} className="bg-violet-600 hover:bg-violet-500 text-white">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Calendar */}
          <div
            className={`transition-all duration-500 ease-out ${
              step === 2
                ? 'opacity-100 translate-x-0'
                : step > 2
                ? 'opacity-0 -translate-x-full absolute inset-0'
                : 'opacity-0 translate-x-full absolute inset-0'
            }`}
          >
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-2">
                    <Calendar className="w-8 h-8 text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Connect Google Calendar</h1>
                  <p className="text-zinc-400">Let Kyra manage your schedule</p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => window.open('/api/auth/google', '_blank')}
                    className="bg-white text-zinc-900 hover:bg-zinc-200 gap-2 px-6 h-11"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect Google Calendar
                  </Button>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={next} className="text-zinc-400">
                      Skip
                    </Button>
                    <Button onClick={next} className="bg-violet-600 hover:bg-violet-500 text-white">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 4: Try it */}
          <div
            className={`transition-all duration-500 ease-out ${
              step === 3
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-full absolute inset-0'
            }`}
          >
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-2">
                    <Send className="w-8 h-8 text-green-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Try me out!</h1>
                  <p className="text-zinc-400">Click a prompt to start chatting</p>
                </div>

                <div className="space-y-2">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handlePromptClick(prompt)}
                      disabled={completing}
                      className="w-full text-left rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300 hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-violet-300 transition-all disabled:opacity-50"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={complete}
                    disabled={completing}
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {completing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" /> Get started
                      </>
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

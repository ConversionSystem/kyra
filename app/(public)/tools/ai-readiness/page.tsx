'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

const QUESTIONS = [
  {
    id: 'response_time',
    question: 'How quickly does your team respond to new leads?',
    options: [
      { label: 'Under 5 minutes', score: 10 },
      { label: '5–30 minutes', score: 7 },
      { label: '1–4 hours', score: 4 },
      { label: 'Next business day or later', score: 1 },
    ],
  },
  {
    id: 'after_hours',
    question: 'What happens to leads that come in after business hours?',
    options: [
      { label: 'They get an automated reply immediately', score: 8 },
      { label: 'They wait until we open', score: 3 },
      { label: 'We miss most of them', score: 1 },
    ],
  },
  {
    id: 'channels',
    question: 'How many communication channels do you actively monitor?',
    options: [
      { label: '4+ (phone, email, SMS, web chat, social)', score: 10 },
      { label: '2–3 channels', score: 6 },
      { label: 'Just phone and email', score: 3 },
      { label: 'Mostly just one channel', score: 1 },
    ],
  },
  {
    id: 'followup',
    question: 'How consistent is your follow-up process?',
    options: [
      { label: 'Every lead gets followed up within 24h, multiple times', score: 10 },
      { label: 'Most leads get one follow-up', score: 6 },
      { label: 'It depends on how busy we are', score: 3 },
      { label: 'We don\'t have a follow-up process', score: 1 },
    ],
  },
  {
    id: 'repetitive',
    question: 'What percentage of customer questions are repetitive?',
    options: [
      { label: '70%+ — same questions over and over', score: 10 },
      { label: '40–70% — a lot of overlap', score: 7 },
      { label: '20–40% — some patterns', score: 4 },
      { label: 'Under 20% — mostly unique', score: 2 },
    ],
  },
  {
    id: 'team_size',
    question: 'How many people handle customer communication?',
    options: [
      { label: 'Just me / 1 person', score: 10 },
      { label: '2–3 people', score: 7 },
      { label: '4–10 people', score: 4 },
      { label: '10+ dedicated team', score: 2 },
    ],
  },
  {
    id: 'missed_revenue',
    question: 'Roughly how many leads do you think you lose per month to slow responses?',
    options: [
      { label: '20+ — way too many', score: 10 },
      { label: '10–20 — a noticeable number', score: 7 },
      { label: '5–10 — a few slip through', score: 4 },
      { label: 'Almost none — we\'re pretty tight', score: 1 },
    ],
  },
];

function getGrade(score: number): { grade: string; color: string; message: string; recommendation: string } {
  if (score >= 55) {
    return {
      grade: 'A',
      color: 'text-emerald-400',
      message: 'Your business is AI-ready!',
      recommendation: 'You have high lead volume, repetitive questions, and limited staff — this is exactly where an AI worker delivers massive ROI. Deploy one today and watch your response time drop to under 60 seconds.',
    };
  }
  if (score >= 40) {
    return {
      grade: 'B',
      color: 'text-blue-400',
      message: 'Strong candidate for AI.',
      recommendation: 'You\'re handling things well but there are clear gaps — especially in after-hours coverage and follow-up consistency. An AI worker would plug those gaps and free your team for higher-value work.',
    };
  }
  if (score >= 25) {
    return {
      grade: 'C',
      color: 'text-amber-400',
      message: 'Room for improvement.',
      recommendation: 'Your current processes work but they\'re not scalable. As you grow, response times will slip and leads will fall through. Starting with an AI worker now means you\'re ready before the problem gets worse.',
    };
  }
  return {
    grade: 'D',
    color: 'text-red-400',
    message: 'You might not need AI yet.',
    recommendation: 'Your communication volume is low and well-handled. An AI worker would still save time, but the ROI is smaller at your scale. Revisit when volume picks up or you expand channels.',
  };
}

export default function AIReadinessPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [industry, setIndustry] = useState('');

  const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
  const maxScore = QUESTIONS.length * 10;
  const percentage = Math.round((totalScore / maxScore) * 100);
  const grade = getGrade(totalScore);
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            🧪 Free Tool
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            AI Readiness Score
          </h1>
          <p className="text-slate-400 text-lg">
            Answer 7 questions. Find out if your business is ready for an AI worker — and how much revenue you&apos;re leaving on the table.
          </p>
        </div>

        {!showResult ? (
          <div className="space-y-8">
            {QUESTIONS.map((q, qi) => (
              <div key={q.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-sm text-indigo-400 font-medium mb-2">Question {qi + 1} of {QUESTIONS.length}</p>
                <h3 className="text-lg font-bold mb-4">{q.question}</h3>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
                      className={`w-full text-left rounded-xl px-4 py-3 text-sm transition-all border ${
                        answers[q.id] === opt.score
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {allAnswered && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">What industry are you in? (optional)</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Dental, Real Estate, Cannabis"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setShowResult(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-xl transition"
                >
                  Get My AI Readiness Score →
                </button>
              </div>
            )}

            {!allAnswered && (
              <p className="text-center text-slate-500 text-sm">
                Answer all {QUESTIONS.length} questions to see your score.
                <span className="text-slate-400 font-medium"> ({Object.keys(answers).length}/{QUESTIONS.length} complete)</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Score card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Your AI Readiness Score</p>
              <div className={`text-8xl font-black ${grade.color} mb-2`}>{grade.grade}</div>
              <p className="text-2xl font-bold text-white mb-1">{percentage}%</p>
              <p className={`text-lg font-medium ${grade.color}`}>{grade.message}</p>
            </div>

            {/* Recommendation */}
            <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-6">
              <h3 className="font-bold text-indigo-300 mb-2">💡 Our recommendation</h3>
              <p className="text-slate-300 leading-relaxed">{grade.recommendation}</p>
            </div>

            {/* Share */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-400 mb-3">Share your score</p>
              <div className="flex justify-center gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=I%20scored%20${percentage}%25%20on%20the%20AI%20Readiness%20assessment!%20${grade.grade}%20grade%20%F0%9F%A4%96%20Check%20yours%3A&url=https://kyra.conversionsystem.com/tools/ai-readiness`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Share on X →
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=https://kyra.conversionsystem.com/tools/ai-readiness`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Share on LinkedIn →
                </a>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-black mb-3">
                {totalScore >= 40 ? 'Ready to deploy your AI worker?' : 'Want to see what an AI worker looks like?'}
              </h3>
              <p className="text-indigo-200 mb-6">
                {industry
                  ? `We have a pre-built template for ${industry}. Deploy in under 5 minutes.`
                  : '50+ industry templates ready to go. Deploy in under 5 minutes.'}
              </p>
              <Link
                href="/solo"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black px-8 py-3 rounded-xl hover:bg-indigo-50 transition"
              >
                Try Kyra Free →
              </Link>
            </div>

            <button
              onClick={() => { setShowResult(false); setAnswers({}); }}
              className="w-full text-slate-500 hover:text-white text-sm py-2 transition"
            >
              ← Retake assessment
            </button>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}

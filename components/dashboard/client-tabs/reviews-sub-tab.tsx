'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star, MessageSquare, Send, Loader2, Sparkles,
  TrendingUp, Users, AlertTriangle, Plus, RefreshCw,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { CopyButton } from '@/components/ui/copy-button';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReviewRequest {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  service: string | null;
  status: string;
  rating: number | null;
  feedback: string | null;
  review_platform: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
}

interface ReviewStats {
  totalSent: number;
  totalResponded: number;
  positiveCount: number;
  negativeCount: number;
  avgRating: number;
  reviewClickCount: number;
  responseRate: number;
}

type ResponseTone = 'professional' | 'friendly' | 'empathetic' | 'enthusiastic';

// ── Helpers ────────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    pending: { bg: 'bg-gray-100 text-gray-600', label: 'Pending' },
    sent: { bg: 'bg-blue-100 text-blue-700', label: 'Sent' },
    positive: { bg: 'bg-green-100 text-green-700', label: 'Positive' },
    negative: { bg: 'bg-red-100 text-red-700', label: 'Negative' },
    review_clicked: { bg: 'bg-emerald-100 text-emerald-700', label: 'Review Left' },
    no_response: { bg: 'bg-gray-100 text-gray-500', label: 'No Response' },
    escalated: { bg: 'bg-red-100 text-red-700', label: 'Escalated' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
      {s.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReviewsSubTab({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = (client.container_config || {}) as Record<string, unknown>;
  const businessName = (cfg.business_name as string) || client.name;

  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'reviews' | 'respond' | 'request'>('overview');

  // AI response state
  const [selectedReview, setSelectedReview] = useState<ReviewRequest | null>(null);
  const [responseTone, setResponseTone] = useState<ResponseTone>('professional');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [generating, setGenerating] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  // Review request state
  const [requestContact, setRequestContact] = useState('');
  const [requestService, setRequestService] = useState('');
  const [requestSending, setRequestSending] = useState(false);

  // Load reviews and stats
  const loadData = useCallback(async () => {
    try {
      const [reviewsRes, statsRes] = await Promise.allSettled([
        fetch(`/api/agency/clients/${clientId}/reviews`).then(r => r.json()),
        fetch(`/api/agency/clients/${clientId}/reviews/stats`).then(r => r.json()),
      ]);

      if (reviewsRes.status === 'fulfilled') {
        setReviews(reviewsRes.value.data || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Generate AI response
  const handleGenerateResponse = useCallback(async () => {
    if (!selectedReview) return;
    setGenerating(true);
    setResponseError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/reviews/ai-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedReview.rating || 3,
          reviewText: selectedReview.feedback || '',
          reviewerName: selectedReview.contact_name,
          platform: selectedReview.review_platform || 'Google',
          service: selectedReview.service || '',
          tone: responseTone,
          businessName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          setGeneratedResponse(data.response);
        } else {
          setResponseError(data.error || 'Failed to generate response');
        }
      }
    } catch { setResponseError('Failed to generate response'); }
    finally { setGenerating(false); }
  }, [selectedReview, responseTone, clientId, businessName]);

  // Send review request
  const handleSendRequest = useCallback(async () => {
    if (!requestContact.trim()) return;
    setRequestSending(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/reviews/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactPhone: requestContact,
          service: requestService,
        }),
      });
      setRequestContact('');
      setRequestService('');
      loadData();
    } catch { /* non-fatal */ }
    finally { setRequestSending(false); }
  }, [requestContact, requestService, clientId, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Reputation Management</h3>
          <p className="text-xs text-gray-500 mt-0.5">Track reviews, respond with AI, and request new reviews.</p>
        </div>
        <button
          onClick={() => loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
          { id: 'reviews' as const, label: 'Reviews', icon: Star },
          { id: 'respond' as const, label: 'AI Respond', icon: Sparkles },
          { id: 'request' as const, label: 'Request Reviews', icon: Send },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeView === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <v.icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Reviews Requested" value={stats.totalSent} />
            <MetricCard
              label="Average Rating"
              value={stats.avgRating > 0 ? `${stats.avgRating} ⭐` : 'N/A'}
              color={stats.avgRating >= 4 ? 'text-green-600' : stats.avgRating >= 3 ? 'text-amber-600' : 'text-red-600'}
            />
            <MetricCard label="Response Rate" value={`${stats.responseRate}%`} sub={`${stats.totalResponded} responded`} />
            <MetricCard
              label="Reviews Left"
              value={stats.reviewClickCount}
              sub={`${stats.positiveCount} positive · ${stats.negativeCount} negative`}
            />
          </div>

          {stats.totalSent === 0 && (
            <div className="text-center py-8 px-6 rounded-xl border border-gray-200 bg-white">
              <Star className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Review Data Yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Start requesting reviews from your customers to build your online reputation.
              </p>
              <button
                onClick={() => setActiveView('request')}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Send className="w-4 h-4" /> Request Reviews
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      {activeView === 'reviews' && (
        <div className="space-y-3">
          {reviews.length > 0 ? (
            reviews.map(review => (
              <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{review.contact_name}</span>
                      <StatusBadge status={review.status} />
                      {review.review_platform && (
                        <span className="text-xs text-gray-400">{review.review_platform}</span>
                      )}
                    </div>
                    {review.rating && <StarRating rating={review.rating} />}
                  </div>
                  <span className="text-xs text-gray-400">
                    {review.sent_at ? new Date(review.sent_at).toLocaleDateString() : new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {review.feedback && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">
                    &ldquo;{review.feedback}&rdquo;
                  </p>
                )}

                {review.service && (
                  <p className="text-xs text-gray-400">Service: {review.service}</p>
                )}

                {review.rating && review.feedback && (
                  <button
                    onClick={() => { setSelectedReview(review); setActiveView('respond'); }}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <Sparkles className="w-3 h-3" /> Generate AI Response
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Reviews Yet</h3>
              <p className="text-sm text-gray-500">Reviews will appear here as customers respond to review requests.</p>
            </div>
          )}
        </div>
      )}

      {/* AI Respond */}
      {activeView === 'respond' && (
        <div className="space-y-4">
          {/* Select a review to respond to */}
          {!selectedReview ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Select a Review to Respond To</h4>
              {reviews.filter(r => r.rating && r.feedback).length > 0 ? (
                <div className="space-y-2">
                  {reviews.filter(r => r.rating && r.feedback).map(review => (
                    <button
                      key={review.id}
                      onClick={() => setSelectedReview(review)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{review.contact_name}</span>
                        {review.rating && <StarRating rating={review.rating} />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{review.feedback}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No reviews with feedback available. Reviews with ratings and text will appear here.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected review */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{selectedReview.contact_name}</span>
                    {selectedReview.rating && <StarRating rating={selectedReview.rating} />}
                  </div>
                  <button
                    onClick={() => { setSelectedReview(null); setGeneratedResponse(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Change review
                  </button>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  &ldquo;{selectedReview.feedback}&rdquo;
                </p>
              </div>

              {/* Tone selector */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Response Tone</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'professional', label: '👔 Professional' },
                    { id: 'friendly', label: '😊 Friendly' },
                    { id: 'empathetic', label: '💙 Empathetic' },
                    { id: 'enthusiastic', label: '🎉 Enthusiastic' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setResponseTone(t.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        responseTone === t.id
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateResponse}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Response (1 credit)
                </button>
              </div>

              {responseError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">{responseError}</p>
                </div>
              )}

              {/* Generated response */}
              {generatedResponse && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-800">AI Generated Response</span>
                    <CopyButton text={generatedResponse} className="inline-flex items-center gap-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100" />
                  </div>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">{generatedResponse}</p>
                  <p className="text-xs text-green-600 mt-3">
                    Copy this response and paste it on the review platform.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Request Reviews */}
      {activeView === 'request' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Send Review Request</h4>
            <p className="text-xs text-gray-500 mb-4">
              Send an SMS asking a customer to rate their experience.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Phone</label>
                <input
                  value={requestContact}
                  onChange={e => setRequestContact(e.target.value)}
                  placeholder="+1 555-123-4567"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Service Provided (optional)</label>
                <input
                  value={requestService}
                  onChange={e => setRequestService(e.target.value)}
                  placeholder="e.g., AC repair, dental cleaning"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSendRequest}
                disabled={requestSending || !requestContact.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {requestSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Review Request
              </button>
            </div>
          </div>

          {/* Review Request Templates */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Templates</h4>
            <div className="space-y-2">
              {[
                `Hi {{first_name}}! Thanks for choosing ${businessName}! We'd love to hear how it went. Could you rate us 1-5? ⭐`,
                `Hey {{first_name}} 👋 Hope you're enjoying your experience with ${businessName}! If you have a sec, a quick Google review would mean the world to us 🙏`,
                `{{first_name}}, thank you for trusting ${businessName}! Your feedback helps us improve. Reply with 1-5 to rate your experience!`,
              ].map((template, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <p className="flex-1 text-sm text-gray-700">{template}</p>
                  <CopyButton text={template} className="inline-flex items-center gap-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

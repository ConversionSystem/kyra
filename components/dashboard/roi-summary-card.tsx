'use client';

/**
 * RoiSummaryCard
 *
 * Shows agencies exactly what Kyra is saving them each month.
 * The "churn-prevention" widget — every agency owner sees their ROI
 * and can never justify canceling.
 *
 * Calculation:
 *   • 4 min avg per conversation (qualify + respond + log)
 *   • $30/hr for human answering service / VA (conservative)
 *   • Hours saved = conversations × 4 ÷ 60
 *   • $ saved = hours × $30
 *   • ROI = $ saved ÷ Kyra plan cost
 */

import { TrendingUp, Clock, DollarSign, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const MINS_PER_CONVO = 4;       // avg minutes a human spends per lead/inquiry
const HUMAN_RATE_PER_HR = 30;   // $/hr — answering service / part-time VA (conservative)

const PLAN_COST: Record<string, number> = {
  free: 0,
  lite: 99,
  starter: 99,
  pro: 249,
  scale: 499,
};

function fmt$(n: number, decimals = 0) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

interface Props {
  totalConversations: number;
  plan: string;
  /** If provided, uses actual client billing totals instead of plan price */
  billingCents?: number;
  /** Link to the performance page */
  showLink?: boolean;
}

export default function RoiSummaryCard({
  totalConversations,
  plan,
  billingCents,
  showLink = true,
}: Props) {
  const kyraCost =
    billingCents != null && billingCents > 0
      ? billingCents / 100
      : (PLAN_COST[plan.toLowerCase()] ?? 99);

  const hoursSaved = (totalConversations * MINS_PER_CONVO) / 60;
  const dollarSaved = hoursSaved * HUMAN_RATE_PER_HR;
  const netSavings = dollarSaved - kyraCost;
  const roiMultiple = kyraCost > 0 ? dollarSaved / kyraCost : null;

  // Don't show if no usage yet
  if (totalConversations === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">ROI report ready once conversations start</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Share your client portal link or connect GHL to start tracking.
          </p>
        </div>
      </div>
    );
  }

  const isPositive = netSavings > 0;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">AI Worker ROI — This Month</p>
            <p className="text-xs text-gray-400">vs. hiring a human answering service</p>
          </div>
        </div>
        {roiMultiple !== null && roiMultiple >= 1 && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-emerald-600">{roiMultiple.toFixed(0)}×</p>
            <p className="text-[10px] text-emerald-500 font-medium">return</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-white border border-emerald-100 p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <p className="text-lg font-black text-gray-900">{totalConversations.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 leading-tight">convos<br />handled</p>
        </div>
        <div className="rounded-xl bg-white border border-emerald-100 p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-lg font-black text-gray-900">
            {hoursSaved >= 10 ? Math.round(hoursSaved) : hoursSaved.toFixed(1)}h
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">staff hours<br />saved</p>
        </div>
        <div className="rounded-xl bg-white border border-emerald-100 p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-gray-900">{fmt$(dollarSaved)}</p>
          <p className="text-[10px] text-gray-400 leading-tight">vs. hiring<br />staff</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="rounded-xl bg-white border border-emerald-100 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-gray-400">
            Kyra cost: <span className="font-semibold text-gray-600">{fmt$(kyraCost)}/mo</span>
          </span>
          <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-gray-500'}`}>
            Net savings: {fmt$(Math.abs(netSavings))}{isPositive ? ' ahead' : ' to break even'}
          </span>
        </div>
        {showLink && (
          <Link
            href="/agency/performance"
            className="shrink-0 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold whitespace-nowrap"
          >
            Full report <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Methodology footnote */}
      <p className="text-[10px] text-gray-400 mt-2">
        Estimate: {MINS_PER_CONVO} min/conversation × {fmt$(HUMAN_RATE_PER_HR, 0)}/hr answering service rate. Actual savings vary.
      </p>
    </div>
  );
}

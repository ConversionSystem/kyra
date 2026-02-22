'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Severity = 'critical' | 'warning' | 'info';
type ActionItem = {
  id: string;
  title: string;
  desc: string;
  link: string;
  linkLabel: string;
  severity: Severity;
};

const SEV_STYLES: Record<Severity, { card: string; icon: string; label: string }> = {
  critical: { card: 'border-red-200 bg-red-50', icon: 'text-red-500', label: 'Critical' },
  warning: { card: 'border-amber-200 bg-amber-50', icon: 'text-amber-500', label: 'Needed' },
  info: { card: 'border-blue-200 bg-blue-50', icon: 'text-blue-500', label: 'Todo' },
};

function SevIcon({ severity }: { severity: Severity }) {
  const cls = `h-4 w-4 shrink-0 ${SEV_STYLES[severity].icon}`;
  if (severity === 'critical') return <AlertTriangle className={cls} />;
  if (severity === 'warning') return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

export default function CeoActionBoard() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/health-check');
      const d = await r.json();
      setItems(d.checks ?? []);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const visible = items.filter(i => !dismissed.has(i.id));
  const criticals = visible.filter(i => i.severity === 'critical').length;

  if (!loading && visible.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 font-medium">All systems go — no pending action items.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={criticals > 0 ? 'border-red-200' : 'border-amber-200'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">
              🧠 CEO Action Board
            </CardTitle>
            {criticals > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                {criticals} critical
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400" onClick={fetch_} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastRefresh && (
          <p className="text-xs text-gray-400 mt-0.5">
            Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading && items.length === 0 ? (
          <div className="text-xs text-gray-400 py-2">Checking…</div>
        ) : (
          <div className="space-y-2">
            {visible.map(item => {
              const styles = SEV_STYLES[item.severity];
              const isExternal = item.link.startsWith('http');
              return (
                <div key={item.id} className={`rounded-lg border p-3 ${styles.card}`}>
                  <div className="flex items-start gap-2">
                    <SevIcon severity={item.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                        <button
                          type="button"
                          onClick={() => setDismissed(s => new Set([...s, item.id]))}
                          className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      {isExternal ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-indigo-600 hover:underline mt-1 inline-block"
                        >
                          {item.linkLabel}
                        </a>
                      ) : (
                        <Link href={item.link} className="text-xs font-medium text-indigo-600 hover:underline mt-1 inline-block">
                          {item.linkLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {dismissed.size > 0 && (
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 pt-1"
                onClick={() => setDismissed(new Set())}
              >
                Show {dismissed.size} dismissed item{dismissed.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

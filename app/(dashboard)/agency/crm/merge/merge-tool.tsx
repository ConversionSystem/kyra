'use client';

import { useState, useEffect } from 'react';
import { GitMerge, Mail, Phone, Loader2, CheckCircle2, AlertTriangle, User, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DuplicateContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  stage: string;
  created_at: string;
  activity_count: number;
}

interface DuplicateGroup {
  key: string;
  matchType: 'email' | 'phone';
  contacts: DuplicateContact[];
}

export function MergeTool() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [merged, setMerged] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/agency/crm/merge')
      .then(r => r.json())
      .then(d => { setGroups(d.groups || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleMerge = async (group: DuplicateGroup, primaryId: string) => {
    const secondaryId = group.contacts.find(c => c.id !== primaryId)?.id;
    if (!secondaryId) return;
    if (!confirm('Merge these contacts? The secondary contact will be deleted and all activities moved to the primary.')) return;

    setMerging(group.key);

    const res = await fetch('/api/agency/crm/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary_id: primaryId, secondary_id: secondaryId }),
    });

    if (res.ok) {
      setMerged(prev => new Set([...prev, group.key]));
    }
    setMerging(null);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeGroups = groups.filter(g => !merged.has(g.key));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitMerge className="h-6 w-6 text-indigo-600" /> Merge Duplicates
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {activeGroups.length === 0
            ? 'No duplicate contacts found — your CRM is clean!'
            : `Found ${activeGroups.length} potential duplicate${activeGroups.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Merged success */}
      {merged.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-700">
            {merged.size} contact{merged.size > 1 ? 's' : ''} merged successfully
          </p>
        </div>
      )}

      {/* No duplicates */}
      {activeGroups.length === 0 && merged.size === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-gray-900 font-medium">All clean!</p>
          <p className="text-sm text-gray-500 mt-1">No duplicate contacts detected in your CRM.</p>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {activeGroups.map(group => (
          <div key={group.key} className="bg-white border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-800">
                Possible duplicate ({group.matchType === 'email' ? 'same email' : 'same phone'})
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {group.contacts.map(contact => {
                const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed';
                const isProcessing = merging === group.key;

                return (
                  <div key={contact.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      {(contact.first_name?.[0] || '?').toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {contact.email && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                      <span>Score: {contact.score}</span>
                      <span className="capitalize">{contact.stage}</span>
                      <span>{contact.activity_count} activities</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(contact.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                      disabled={isProcessing}
                      onClick={() => handleMerge(group, contact.id)}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Keep This</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

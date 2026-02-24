'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Mail } from 'lucide-react';

interface OrphanedUser {
  id: string;
  email: string;
  created_at: string;
}

export default function OrphanedUsersClient() {
  const [users, setUsers] = useState<OrphanedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orphaned-users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setUsers(json.users || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Orphaned Signups
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Auth users who never created an agency. These are your hottest rescue leads.
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            Failed to load orphaned users: {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">{users.length} orphaned auth users</p>
            <p className="text-xs text-gray-400">Click an email to copy</p>
          </div>

          {users.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No orphaned signups 🎉</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigator.clipboard.writeText(u.email)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                      {u.email[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 text-gray-400" /> {u.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(u.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">Click to copy</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { ConversationsFeed } from './conversations-feed';
import { Inbox, Loader2 } from 'lucide-react';

export const metadata = { title: 'Conversations — Kyra' };

export default function ConversationsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Inbox className="h-6 w-6 text-indigo-500" />
          Conversations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Every message your AI employees send and receive — across all clients, in one place.
        </p>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }>
        <ConversationsFeed />
      </Suspense>
    </div>
  );
}

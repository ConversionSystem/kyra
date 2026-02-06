'use client';

import { Conversation } from '@/types';
import { cn, formatDate, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group conversations by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedConversations = {
    today: [] as Conversation[],
    yesterday: [] as Conversation[],
    lastWeek: [] as Conversation[],
    older: [] as Conversation[],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.created_at);
    convDate.setHours(0, 0, 0, 0);

    if (convDate.getTime() === today.getTime()) {
      groupedConversations.today.push(conv);
    } else if (convDate.getTime() === yesterday.getTime()) {
      groupedConversations.yesterday.push(conv);
    } else if (convDate > lastWeek) {
      groupedConversations.lastWeek.push(conv);
    } else {
      groupedConversations.older.push(conv);
    }
  });

  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-zinc-800 bg-zinc-950 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Conversations</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <ConversationGroup
          title="Today"
          conversations={groupedConversations.today}
          currentId={currentConversationId}
          onSelect={onSelectConversation}
        />
        <ConversationGroup
          title="Yesterday"
          conversations={groupedConversations.yesterday}
          currentId={currentConversationId}
          onSelect={onSelectConversation}
        />
        <ConversationGroup
          title="Previous 7 Days"
          conversations={groupedConversations.lastWeek}
          currentId={currentConversationId}
          onSelect={onSelectConversation}
        />
        <ConversationGroup
          title="Older"
          conversations={groupedConversations.older}
          currentId={currentConversationId}
          onSelect={onSelectConversation}
        />
      </div>
    </div>
  );
}

function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
}: {
  title: string;
  conversations: Conversation[];
  currentId?: string;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="mb-2 px-2 text-xs font-medium text-zinc-500">{title}</h3>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
              currentId === conv.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {conv.title || 'New conversation'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

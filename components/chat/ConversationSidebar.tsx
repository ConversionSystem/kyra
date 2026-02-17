'use client';

import { Conversation } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Plus, MessageSquare, ChevronLeft, ChevronRight, Trash2,
  Radio, Zap, Bot, Plug, Brain, Settings, Menu, X
} from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  credits?: { used: number; limit: number; plan: string } | null;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  credits,
  mobileOpen,
  onMobileToggle,
}: ConversationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    onMobileToggle?.(); // close mobile sidebar on selection
  };

  const handleNewConversation = () => {
    onNewConversation();
    onMobileToggle?.();
  };

  const navLinks = [
    { href: '/settings/channels', icon: Radio, label: 'Channels' },
    { href: '/settings/skills', icon: Zap, label: 'Skills' },
    { href: '/automations', icon: Bot, label: 'Automations' },
    { href: '/settings', icon: Plug, label: 'Integrations' },
    { href: '/memories', icon: Brain, label: 'Memories' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Desktop collapsed state
  if (isCollapsed) {
    return (
      <div className="hidden md:flex h-full w-12 flex-col items-center border-r border-gray-800 bg-gray-900 py-4">
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} className="mb-4 text-gray-400 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewConversation} className="text-gray-400 hover:text-white">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col border-r border-gray-800 bg-gray-900">
      {/* Header with collapse */}
      <div className="flex items-center justify-between p-3 pb-0">
        <span className="text-sm font-semibold text-white">Kyra</span>
        <div className="flex items-center gap-1">
          {/* Desktop: collapse. Mobile: close */}
          <Button variant="ghost" size="icon" onClick={() => { setIsCollapsed(true); }} className="hidden md:flex h-7 w-7 text-gray-500 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMobileToggle} className="md:hidden h-7 w-7 text-gray-500 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <Button
          onClick={handleNewConversation}
          variant="outline"
          className="w-full justify-start gap-2 border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <ConversationGroup title="Today" conversations={groupedConversations.today} currentId={currentConversationId} onSelect={handleSelectConversation} onDelete={onDeleteConversation} />
        <ConversationGroup title="Yesterday" conversations={groupedConversations.yesterday} currentId={currentConversationId} onSelect={handleSelectConversation} onDelete={onDeleteConversation} />
        <ConversationGroup title="Previous 7 Days" conversations={groupedConversations.lastWeek} currentId={currentConversationId} onSelect={handleSelectConversation} onDelete={onDeleteConversation} />
        <ConversationGroup title="Older" conversations={groupedConversations.older} currentId={currentConversationId} onSelect={handleSelectConversation} onDelete={onDeleteConversation} />
      </div>

      {/* Nav Links */}
      <div className="border-t border-gray-800 p-2">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white min-h-[44px]"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
        {credits && (
          <div className="mt-2 rounded-lg px-3 py-2 text-xs text-gray-500">
            {credits.used.toLocaleString()} / {credits.limit.toLocaleString()} credits · {credits.plan}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={onMobileToggle} />
          {/* Sidebar panel */}
          <div className="absolute inset-y-0 left-0 w-64 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
  onDelete,
}: {
  title: string;
  conversations: Conversation[];
  currentId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-3">
      <h3 className="mb-1 px-2 text-xs font-medium text-gray-400">{title}</h3>
      <div className="space-y-0.5">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'group flex w-full items-center rounded-lg text-sm transition-colors',
              currentId === conv.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left min-h-[44px]"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="truncate">{conv.title || 'New conversation'}</span>
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                className="mr-1 rounded p-1.5 transition-opacity hover:bg-gray-200 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 active:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

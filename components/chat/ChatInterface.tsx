'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation, UserFile } from '@/types';
import { MessageBubble, MessageSkeleton } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { useRouter } from 'next/navigation';
import { Sparkles, Menu } from 'lucide-react';
import { ReminderNotification } from '@/components/reminders/ReminderNotification';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { CreditWarningBanner } from './CreditBadge';

interface ChatInterfaceProps {
  initialConversation?: Conversation;
  initialMessages?: Message[];
  conversations: Conversation[];
  userId: string;
}

export function ChatInterface({
  initialConversation,
  initialMessages = [],
  conversations: initialConversations,
  userId,
}: ChatInterfaceProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>(initialConversation);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [credits, setCredits] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch initial credit balance
  useEffect(() => {
    fetch('/api/usage')
      .then((res) => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data) {
          setCredits({ used: data.creditsUsed, limit: data.creditsLimit, plan: data.plan });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-load most recent conversation on first mount (not after "New Chat")
  const isNewChatRef = useRef(false);
  useEffect(() => {
    if (!initialConversation && initialConversations.length > 0 && !isNewChatRef.current) {
      router.replace(`/chat/${initialConversations[0].id}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Refresh conversations periodically
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json() as Conversation[];
          setConversations(data);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${id}&messages=true`);
      if (!res.ok) {
        router.push(`/chat/${id}`);
        return;
      }
      const data = await res.json();
      const conv = conversations.find(c => c.id === id);
      if (conv) {
        setCurrentConversation(conv);
        setMessages(data.messages || []);
        setStreamingContent('');
        isNewChatRef.current = false;
        window.history.replaceState(null, '', `/chat/${id}`);
      }
    } catch {
      router.push(`/chat/${id}`);
    }
  }, [router, conversations]);

  const handleNewConversation = useCallback(() => {
    isNewChatRef.current = true;
    setCurrentConversation(undefined);
    setMessages([]);
    setStreamingContent('');
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversation?.id === id) {
          setCurrentConversation(undefined);
          setMessages([]);
          router.push('/chat');
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [currentConversation, router]);

  const isOutOfCredits = credits !== null && credits.used >= credits.limit;

  const handleSendMessage = async (content: string, attachedFiles?: UserFile[]) => {
    if (!content.trim() && (!attachedFiles || attachedFiles.length === 0)) return;
    if (isOutOfCredits) return;

    setIsLoading(true);
    setStreamingContent('');

    // Build display content with file references
    const fileNames = attachedFiles?.map(f => f.name) || [];
    const displayContent = fileNames.length > 0
      ? `${content}${content ? '\n' : ''}[Attached: ${fileNames.join(', ')}]`
      : content;

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation?.id || '',
      role: 'user',
      content: displayContent,
      metadata: attachedFiles ? { files: attachedFiles } : {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversation_id: currentConversation?.id,
          file_ids: attachedFiles?.map(f => f.id),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Chat API error:', response.status, errorText);
        throw new Error(`Failed to send message (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      let conversationId = currentConversation?.id;
      let newConversation: Conversation | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'conversation') {
                newConversation = parsed.conversation;
                conversationId = parsed.conversation.id;
                setConversations((prev) => {
                  const exists = prev.some((c) => c.id === conversationId);
                  if (!exists && newConversation) {
                    return [newConversation, ...prev];
                  }
                  return prev;
                });
                setCurrentConversation(newConversation);
              } else if (parsed.type === 'usage') {
                setCredits({
                  used: parsed.usage,
                  limit: parsed.limit,
                  plan: parsed.plan,
                });
              } else if (parsed.type === 'content') {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === 'message') {
                setMessages((prev) => {
                  const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
                  return [...filtered, parsed.userMessage, parsed.assistantMessage];
                });
                setStreamingContent('');
              } else if (parsed.type === 'memory_saved') {
                console.log('Memory saved:', parsed.memory);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }

      if (newConversation && !currentConversation) {
        router.replace(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: currentConversation?.id || '',
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const showEmptyState = messages.length === 0 && !streamingContent && !currentConversation;

  return (
    <div className="flex h-[100dvh] bg-zinc-950">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        credits={credits}
        mobileOpen={mobileSidebarOpen}
        onMobileToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar with hamburger on mobile */}
        <div className="flex items-center justify-between px-3 py-2 md:justify-end">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <NotificationCenter />
        </div>

        {credits && (
          <CreditWarningBanner creditsUsed={credits.used} creditsLimit={credits.limit} />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-4" />
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {streamingContent && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    conversation_id: '',
                    role: 'assistant',
                    content: streamingContent,
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}
              {isLoading && !streamingContent && <MessageSkeleton />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input — centered vertically when empty, bottom when chatting */}
        <div className={showEmptyState ? 'flex flex-1 flex-col items-center justify-center px-4' : 'p-3 md:p-4 pb-safe'}>
          <div className={showEmptyState ? 'w-full max-w-3xl' : 'mx-auto max-w-3xl'}>
            {showEmptyState && (
              <div className="mb-6 text-center">
                <div className="relative mb-4 inline-block">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                </div>
                <DynamicGreeting />
              </div>
            )}
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={isOutOfCredits}
            />
          </div>
        </div>
      </div>

      <ReminderNotification />
    </div>
  );
}

function DynamicGreeting() {
  const greetings = [
    'What can I help you with today?',
    'Ask me anything — I remember everything.',
    'Need help researching something?',
    'Let\'s get something done together.',
    'What\'s on your mind?',
    'I can search the web, manage your calendar, and more.',
    'Tell me about your day — I\'ll remember it.',
    'Ready when you are.',
  ];

  const [text, setText] = useState('');

  useEffect(() => {
    setText(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  if (!text) return null;

  return (
    <p className="text-base text-zinc-400">{text}</p>
  );
}

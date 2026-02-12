'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation } from '@/types';
import { MessageBubble, MessageSkeleton } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
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

  // Auto-load most recent conversation if none selected and conversations exist
  useEffect(() => {
    if (!initialConversation && initialConversations.length > 0) {
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
    const interval = setInterval(fetchConversations, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, [router]);

  const handleNewConversation = useCallback(() => {
    setCurrentConversation(undefined);
    setMessages([]);
    router.push('/chat');
  }, [router]);

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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (isOutOfCredits) return;

    setIsLoading(true);
    setStreamingContent('');

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation?.id || '',
      role: 'user',
      content,
      metadata: {},
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

  const showEmptyState = messages.length === 0 && !streamingContent && !initialConversation;

  return (
    <div className="flex h-screen bg-zinc-950">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        credits={credits}
      />

      <div className="flex flex-1 flex-col">
        {/* Subtle top bar: just notification center */}
        <div className="flex items-center justify-end px-4 py-2">
          <NotificationCenter />
        </div>

        {credits && (
          <CreditWarningBanner creditsUsed={credits.used} creditsLimit={credits.limit} />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="mb-2 text-2xl font-semibold text-zinc-100">Hi, I&apos;m Kyra</h1>
              <p className="text-sm text-zinc-500">How can I help you today?</p>
            </div>
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

        {/* Input */}
        <div className="p-4 pb-6">
          <div className="mx-auto max-w-3xl">
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

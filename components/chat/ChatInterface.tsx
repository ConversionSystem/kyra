'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation } from '@/types';
import { MessageBubble, MessageSkeleton } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, Settings, Search, CalendarDays, Lightbulb, MessageSquare, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { ReminderNotification } from '@/components/reminders/ReminderNotification';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { CreditBadge, CreditWarningBanner } from './CreditBadge';

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
      .then((data) => {
        if (data) {
          setCredits({ used: data.creditsUsed, limit: data.creditsLimit, plan: data.plan });
        }
      })
      .catch(() => {});
  }, []);

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
          const data = await response.json();
          setConversations(data);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    // Fetch every 2 seconds to keep sidebar updated
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

  const isOutOfCredits = credits !== null && credits.used >= credits.limit;

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (isOutOfCredits) return;
    
    setIsLoading(true);
    setStreamingContent('');

    // Optimistically add user message
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
                
                // Update conversations list
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
                // Final message
                setMessages((prev) => {
                  // Remove temp message and add real ones
                  const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
                  return [
                    ...filtered,
                    parsed.userMessage,
                    parsed.assistantMessage,
                  ];
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

      // Update URL if new conversation
      if (newConversation && !currentConversation) {
        router.replace(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Keep user message but show error as assistant response
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

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-100">Kyra</span>
          </div>
          <div className="flex items-center gap-2">
            {credits && (
              <CreditBadge
                creditsUsed={credits.used}
                creditsLimit={credits.limit}
                plan={credits.plan}
              />
            )}
            <NotificationCenter />
            <Link
              href="/calendar"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Link>
            <Link
              href="/memories"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Brain className="h-4 w-4" />
              Memories
            </Link>
            <Link
              href="/usage"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <BarChart3 className="h-4 w-4" />
              Usage
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Credit warning */}
        {credits && (
          <CreditWarningBanner creditsUsed={credits.used} creditsLimit={credits.limit} />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 && !streamingContent ? (
              <div className="flex h-full flex-col items-center justify-center py-12 px-4">
                {/* Animated gradient orb */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                </div>

                <h1 className="mb-1 text-3xl font-bold text-zinc-100">
                  Hi, I&apos;m Kyra
                </h1>
                <p className="mb-8 max-w-lg text-center text-base text-zinc-400">
                  Your personal AI assistant with memory. I learn about you over time 
                  and work across all your platforms.
                </p>

                {/* Capability cards */}
                <div className="mb-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    onClick={() => handleSendMessage("What can you help me with?")}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="rounded-lg bg-violet-500/10 p-2 transition-colors group-hover:bg-violet-500/20">
                      <MessageSquare className="h-5 w-5 text-violet-400" />
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Chat & Ask</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage("Search the web for the latest AI news")}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="rounded-lg bg-blue-500/10 p-2 transition-colors group-hover:bg-blue-500/20">
                      <Search className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Web Search</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage("What's on my calendar today?")}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="rounded-lg bg-emerald-500/10 p-2 transition-colors group-hover:bg-emerald-500/20">
                      <CalendarDays className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Calendar</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage("Remember that I prefer morning meetings")}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="rounded-lg bg-amber-500/10 p-2 transition-colors group-hover:bg-amber-500/20">
                      <Lightbulb className="h-5 w-5 text-amber-400" />
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Remember</span>
                  </button>
                </div>

                {/* Quick prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => handleSendMessage("Give me a summary of today's top news")}
                    className="rounded-full border border-zinc-700/50 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    📰 Today&apos;s top news
                  </button>
                  <button
                    onClick={() => handleSendMessage("Help me write a professional email")}
                    className="rounded-full border border-zinc-700/50 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    ✉️ Write an email
                  </button>
                  <button
                    onClick={() => handleSendMessage("Help me brainstorm ideas for my project")}
                    className="rounded-full border border-zinc-700/50 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    💡 Brainstorm ideas
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={isOutOfCredits}
            />
          </div>
        </div>
      </div>
      
      {/* Reminder notifications */}
      <ReminderNotification />
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Conversation } from '@/types';
import { MessageBubble, MessageSkeleton } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, Settings, Bell } from 'lucide-react';
import Link from 'next/link';
import { ReminderNotification } from '@/components/reminders/ReminderNotification';

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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
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
        throw new Error('Failed to send message');
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
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
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
            <Link
              href="/memories"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Brain className="h-4 w-4" />
              Memories
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 && !streamingContent ? (
              <div className="flex h-full flex-col items-center justify-center py-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="mb-2 text-2xl font-semibold text-zinc-100">
                  Hi, I'm Kyra
                </h1>
                <p className="max-w-md text-center text-zinc-400">
                  Your personal AI assistant. I remember everything you tell me,
                  so just ask me to remember something important!
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => handleSendMessage("What can you do?")}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    What can you do?
                  </button>
                  <button
                    onClick={() => handleSendMessage("Remember that I prefer morning meetings")}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Try: Remember that I prefer morning meetings
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
            />
          </div>
        </div>
      </div>
      
      {/* Reminder notifications */}
      <ReminderNotification />
    </div>
  );
}

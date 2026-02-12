'use client';

import { useState, useEffect } from 'react';
import { Memory, MemoryType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { 
  Search, 
  Trash2, 
  Brain, 
  User, 
  Lightbulb, 
  Calendar, 
  Heart,
  Loader2,
  Plus,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const memoryTypeIcons: Record<MemoryType, React.ReactNode> = {
  fact: <Lightbulb className="h-4 w-4" />,
  person: <User className="h-4 w-4" />,
  decision: <Brain className="h-4 w-4" />,
  event: <Calendar className="h-4 w-4" />,
  preference: <Heart className="h-4 w-4" />,
};

const memoryTypeColors: Record<MemoryType, string> = {
  fact: 'fact',
  person: 'person',
  decision: 'decision',
  event: 'event',
  preference: 'preference',
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    filterMemories();
  }, [memories, searchQuery, selectedType]);

  const fetchMemories = async () => {
    try {
      const response = await fetch('/api/memories');
      if (response.ok) {
        const data = (await response.json()) as any;
        setMemories(Array.isArray(data) ? data : data.memories || []);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMemories = () => {
    let filtered = memories;

    if (selectedType !== 'all') {
      filtered = filtered.filter((m) => m.type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) =>
        m.content.toLowerCase().includes(query)
      );
    }

    setFilteredMemories(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const memoryTypes: (MemoryType | 'all')[] = ['all', 'fact', 'person', 'decision', 'event', 'preference'];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Memory Vault</h1>
            <p className="text-sm text-zinc-400">
              {memories.length} memories stored
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {memoryTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type === 'all' ? 'All' : (
                  <>
                    {memoryTypeIcons[type as MemoryType]}
                    <span className="ml-1">{type}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Memories List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="py-12 text-center">
            <Brain className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="mb-2 text-lg font-medium text-zinc-300">
              {memories.length === 0 ? 'No memories yet' : 'No matching memories'}
            </h3>
            <p className="text-sm text-zinc-500">
              {memories.length === 0
                ? 'Start chatting with Kyra and ask her to remember things!'
                : 'Try adjusting your search or filters'}
            </p>
            {memories.length === 0 && (
              <Link href="/chat">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Start Chatting
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemories.map((memory) => (
              <Card key={memory.id} className="group">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="shrink-0 pt-1">
                    {memoryTypeIcons[memory.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100">{memory.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={memoryTypeColors[memory.type] as any} className="capitalize">
                        {memory.type}
                      </Badge>
                      <span className="text-xs text-zinc-500">
                        {formatDate(memory.created_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 min-h-[44px] min-w-[44px]"
                    onClick={() => handleDelete(memory.id)}
                    disabled={deletingId === memory.id}
                  >
                    {deletingId === memory.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

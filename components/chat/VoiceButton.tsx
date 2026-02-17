'use client';

import { useState, useRef } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';

interface VoiceButtonProps {
  text: string;
}

export function VoiceButton({ text }: VoiceButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (state === 'playing') {
      audioRef.current?.pause();
      audioRef.current = null;
      setState('idle');
      return;
    }

    setState('loading');
    
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 4000) }),
      });
      
      if (!res.ok) throw new Error('TTS failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setState('idle');
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        setState('idle');
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
      setState('playing');
    } catch (e) {
      console.error('Voice playback error:', e);
      setState('idle');
    }
  };

  return (
    <button
      onClick={handlePlay}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      title={state === 'playing' ? 'Stop' : 'Listen'}
    >
      {state === 'loading' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : state === 'playing' ? (
        <Square className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
    </button>
  );
}

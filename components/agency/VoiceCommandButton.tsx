'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Keyboard, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoiceCommandState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'success'
  | 'error'
  | 'text-input';

interface VoiceResult {
  success: boolean;
  action?: string;
  error?: string;
  transcript?: string;
}

export function VoiceCommandButton() {
  const [state, setState] = useState<VoiceCommandState>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [textInput, setTextInput] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-dismiss results ──────────────────────────────────────────────
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const timeout = setTimeout(() => {
        setState('idle');
        setResult(null);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  // ── Focus text input when switching to text mode ──────────────────────
  useEffect(() => {
    if (state === 'text-input') {
      setTimeout(() => textInputRef.current?.focus(), 100);
    }
  }, [state]);

  // ── Recording timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (state === 'recording') {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // ── Start recording ───────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100) {
          setState('error');
          setResult({
            success: false,
            error: 'Recording too short. Try again.',
          });
          return;
        }
        await sendAudio(audioBlob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setState('recording');
    } catch (err) {
      console.error('Mic access error:', err);
      setState('error');
      setResult({
        success: false,
        error: 'Microphone access denied. Please allow mic access.',
      });
    }
  }, []);

  // ── Stop recording ────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  }, []);

  // ── Send audio to API ─────────────────────────────────────────────────
  const sendAudio = async (audioBlob: Blob) => {
    setState('processing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/agency/voice-command', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      setState(data.success ? 'success' : 'error');
    } catch (err) {
      console.error('Voice command error:', err);
      setResult({ success: false, error: 'Network error. Please try again.' });
      setState('error');
    }
  };

  // ── Send text command ─────────────────────────────────────────────────
  const sendTextCommand = async () => {
    const text = textInput.trim();
    if (!text) return;

    setState('processing');
    setTextInput('');

    try {
      const response = await fetch('/api/agency/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      const data = await response.json();
      setResult(data);
      setState(data.success ? 'success' : 'error');
    } catch (err) {
      console.error('Text command error:', err);
      setResult({ success: false, error: 'Network error. Please try again.' });
      setState('error');
    }
  };

  // ── Format time ───────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Handle main button click ──────────────────────────────────────────
  const handleMainClick = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'success' || state === 'error') {
      setResult(null);
      startRecording();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Result toast ──────────────────────────────────────────────── */}
      {result && (state === 'success' || state === 'error') && (
        <div
          className={cn(
            'max-w-sm rounded-xl px-4 py-3 shadow-lg text-sm animate-in slide-in-from-bottom-2 fade-in duration-200',
            result.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">
              {result.success ? '✅' : '❌'}
            </span>
            <div className="min-w-0">
              <p className="font-medium">
                {result.success
                  ? result.action
                  : result.error || "Couldn't understand that"}
              </p>
              {result.transcript && (
                <p className="text-xs opacity-70 mt-1 truncate">
                  &ldquo;{result.transcript}&rdquo;
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setState('idle');
                setResult(null);
              }}
              className="shrink-0 opacity-50 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Text input mode ───────────────────────────────────────────── */}
      {state === 'text-input' && (
        <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 pl-4 pr-2 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendTextCommand();
              if (e.key === 'Escape') {
                setState('idle');
                setTextInput('');
              }
            }}
            placeholder={'e.g. "Update dental client\'s greeting..."'}
            className="bg-transparent outline-none text-sm text-gray-800 w-64 placeholder:text-gray-400"
          />
          <button
            onClick={sendTextCommand}
            disabled={!textInput.trim()}
            className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setState('idle');
              setTextInput('');
            }}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Processing indicator ──────────────────────────────────────── */}
      {state === 'processing' && (
        <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 text-sm text-gray-600 animate-in fade-in duration-200">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Processing…
        </div>
      )}

      {/* ── Recording indicator ───────────────────────────────────────── */}
      {state === 'recording' && (
        <div className="bg-white rounded-full shadow-lg border border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-600 animate-in fade-in duration-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          Recording {formatTime(recordingTime)}
        </div>
      )}

      {/* ── Action buttons row ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Text input toggle (only when idle) */}
        {(state === 'idle' || state === 'success' || state === 'error') && (
          <button
            onClick={() => {
              setResult(null);
              setState('text-input');
            }}
            className="p-3 rounded-full bg-white shadow-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
            title="Type a command instead"
          >
            <Keyboard className="h-5 w-5" />
          </button>
        )}

        {/* Main mic button */}
        <button
          onClick={handleMainClick}
          disabled={state === 'processing' || state === 'text-input'}
          className={cn(
            'relative p-4 rounded-full shadow-lg transition-all',
            state === 'recording'
              ? 'bg-red-500 hover:bg-red-600 text-white scale-110'
              : state === 'processing'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105',
            state === 'text-input' && 'opacity-40 cursor-not-allowed'
          )}
          title={
            state === 'recording'
              ? 'Stop recording'
              : 'Start voice command'
          }
        >
          {/* Pulsing ring while recording */}
          {state === 'recording' && (
            <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
          )}
          {state === 'recording' ? (
            <MicOff className="h-6 w-6 relative z-10" />
          ) : (
            <Mic className="h-6 w-6 relative z-10" />
          )}
        </button>
      </div>
    </div>
  );
}

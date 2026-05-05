'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseVoiceTranscript, ParsedVoiceEntry } from '@/lib/voice-parser';

export default function VoiceButton({
  onResult,
}: {
  onResult: (parsed: ParsedVoiceEntry) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribe(blob);
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      setError('Mic access denied');
      console.error(e);
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    setProcessing(true);
  }

  async function transcribe(blob: Blob) {
    try {
      const fd = new FormData();
      fd.append('audio', blob);
      const res = await fetch('/api/voice', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Voice failed');
      const parsed = parseVoiceTranscript(data.transcript ?? '');
      onResult(parsed);
    } catch (e) {
      setError(String(e));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={processing}
        className={cn(
          'flex h-24 w-24 items-center justify-center rounded-full border-4 border-black transition-all active:translate-x-1 active:translate-y-1',
          recording
            ? 'bg-red-400 shadow-[8px_8px_0_0_#000] animate-pulse'
            : 'bg-yellow-300 shadow-[8px_8px_0_0_#000]',
          processing && 'opacity-50'
        )}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {processing ? (
          <Loader2 className="h-10 w-10 animate-spin" strokeWidth={3} />
        ) : recording ? (
          <Square className="h-10 w-10" strokeWidth={3} />
        ) : (
          <Mic className="h-10 w-10" strokeWidth={3} />
        )}
      </button>
      <p className="text-center text-xs font-bold uppercase">
        {processing ? 'Processing...' : recording ? 'Tap to stop' : 'Tap & speak'}
      </p>
      {error && (
        <p className="text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

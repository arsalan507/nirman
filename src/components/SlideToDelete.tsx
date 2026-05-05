'use client';

import { useRef, useState, useCallback } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';

/**
 * Slide-to-confirm delete — user drags the handle to the end to confirm.
 * Prevents accidental deletes. Touch + mouse support.
 */
export default function SlideToDelete({
  onConfirm,
  onCancel,
  label = 'Slide to delete',
}: {
  onConfirm: () => void;
  onCancel: () => void;
  label?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const startX = useRef(0);
  const trackWidth = useRef(0);
  const HANDLE_SIZE = 56;
  const THRESHOLD = 0.85; // 85% to confirm

  const handleStart = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    trackWidth.current = trackRef.current.offsetWidth - HANDLE_SIZE;
    startX.current = clientX;
    setDragging(true);
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!dragging) return;
      const dx = Math.max(0, Math.min(clientX - startX.current, trackWidth.current));
      setOffsetX(dx);
    },
    [dragging]
  );

  const handleEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const pct = offsetX / trackWidth.current;
    if (pct >= THRESHOLD) {
      setConfirmed(true);
      setOffsetX(trackWidth.current);
      setTimeout(onConfirm, 200);
    } else {
      setOffsetX(0);
    }
  }, [dragging, offsetX, onConfirm]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-full max-w-md animate-[slideUp_0.2s_ease] p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-sm font-bold text-white">Are you sure?</p>
        <div
          ref={trackRef}
          className="relative h-14 overflow-hidden rounded-full border-4 border-black bg-gray-200"
        >
          {/* Track label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-400 select-none">{label}</span>
          </div>

          {/* Red fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-red-400 transition-none"
            style={{ width: offsetX + HANDLE_SIZE, transition: dragging ? 'none' : 'width 0.3s ease' }}
          />

          {/* Handle */}
          <div
            className={`absolute top-1 flex items-center justify-center rounded-full border-2 border-black bg-white shadow-lg select-none ${
              confirmed ? 'bg-red-500' : ''
            }`}
            style={{
              width: HANDLE_SIZE - 8,
              height: HANDLE_SIZE - 8,
              left: offsetX + 4,
              transition: dragging ? 'none' : 'left 0.3s ease',
              cursor: 'grab',
            }}
            onMouseDown={(e) => handleStart(e.clientX)}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          >
            {confirmed ? (
              <Trash2 className="h-5 w-5 text-white" strokeWidth={3} />
            ) : (
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
            )}
          </div>
        </div>

        {/* Global move/end listeners via overlay */}
        {dragging && (
          <div
            className="fixed inset-0 z-[70]"
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
          />
        )}
      </div>
    </div>
  );
}

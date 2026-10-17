'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Command } from 'lucide-react';

interface Action {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  actions: Action[];
  onClose: () => void;
}

export default function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault();
        filtered[selectedIdx].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, filtered, selectedIdx]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Command className="w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Comando..."
            className="flex-1 outline-none text-sm"
          />
          <span className="text-[10px] text-gray-400 font-bold px-1.5 py-0.5 bg-gray-100 rounded">ESC</span>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhum comando encontrado</p>
          ) : filtered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => { a.action(); onClose(); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                i === selectedIdx ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{a.label}</span>
              {a.shortcut && (
                <span className="text-[10px] text-gray-400 font-bold px-1.5 py-0.5 bg-gray-100 rounded">{a.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

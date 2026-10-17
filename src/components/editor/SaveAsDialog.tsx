'use client';

import React, { useState } from 'react';
import { X, Download } from 'lucide-react';

interface SaveAsDialogProps {
  onClose: () => void;
  onSave: (name: string, format: 'png' | 'jpg' | 'json' | 'svg') => void;
  defaultName?: string;
}

const formats = [
  { value: 'png', label: 'PNG', desc: 'Alta qualidade' },
  { value: 'jpg', label: 'JPG', desc: 'Tamanho reduzido' },
  { value: 'json', label: 'JSON', desc: 'Edição futura' },
  { value: 'svg', label: 'SVG', desc: 'Vetorial' },
] as const;

export default function SaveAsDialog({ onClose, onSave, defaultName = 'template' }: SaveAsDialogProps) {
  const [name, setName] = useState(defaultName);
  const [format, setFormat] = useState<'png' | 'jpg' | 'json' | 'svg'>('png');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Guardar como</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome do ficheiro"
          className="w-full border rounded-xl px-3 py-2 text-sm mb-4 outline-none focus:border-[#27A300]"
        />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {formats.map(f => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`px-3 py-2 rounded-xl text-left transition-colors ${format === f.value ? 'bg-[#27A300] text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <p className="font-bold text-xs">{f.label}</p>
              <p className={`text-[10px] ${format === f.value ? 'text-white/70' : 'text-gray-400'}`}>{f.desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => { onSave(name, format); onClose(); }}
          className="w-full bg-[#27A300] text-white font-bold py-2.5 rounded-xl hover:bg-[#1f8a00] transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Guardar
        </button>
      </div>
    </div>
  );
}

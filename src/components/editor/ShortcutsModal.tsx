'use client';

import React from 'react';
import { X, Command as CommandIcon } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: ['⌘', 'Z'], desc: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], desc: 'Redo' },
  { keys: ['⌘', 'C'], desc: 'Copiar' },
  { keys: ['⌘', 'V'], desc: 'Colar' },
  { keys: ['⌘', 'D'], desc: 'Duplicar' },
  { keys: ['⌘', 'A'], desc: 'Selecionar tudo' },
  { keys: ['Del'], desc: 'Eliminar' },
  { keys: ['V'], desc: 'Ferramenta Select' },
  { keys: ['R'], desc: 'Ferramenta Rect' },
  { keys: ['C'], desc: 'Ferramenta Circle' },
  { keys: ['T'], desc: 'Adicionar Texto' },
  { keys: ['L'], desc: 'Ferramenta Line' },
  { keys: ['P'], desc: 'Ferramenta Polygon' },
  { keys: ['G'], desc: 'Toggle Grid' },
  { keys: ['↑', '↓', '←', '→'], desc: 'Mover 1px' },
  { keys: ['⇧', '↑'], desc: 'Mover 10px' },
  { keys: ['⎇', 'Click'], desc: 'Duplicar arrastando' },
  { keys: ['⌘', 'K'], desc: 'Paleta de comandos' },
  { keys: ['F11'], desc: 'Modo Foco' },
  { keys: ['?'], desc: 'Este atalho' },
];

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold flex items-center gap-2">
            <CommandIcon className="w-4 h-4" /> Atalhos de Teclado
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto p-4">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    <kbd className="px-2 py-0.5 text-xs font-bold bg-gray-100 border border-gray-200 rounded-md shadow-sm">{k}</kbd>
                    {j < s.keys.length - 1 && <span className="text-gray-400 text-xs self-center">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

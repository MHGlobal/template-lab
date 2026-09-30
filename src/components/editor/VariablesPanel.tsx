'use client';

import React from 'react';
import type { Variable } from '@/hooks/useVariables';

export default function VariablesPanel({
  variables, onUpdate, onApply, onRestore,
}: {
  variables: Variable[];
  onUpdate: (key: string, value: string) => void;
  onApply: () => void;
  onRestore: () => void;
}) {
  if (variables.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400 text-center">
        Nenhuma variável detectada.<br />Use {'{{nome}}'} no texto.
      </div>
    );
  }
  return (
    <div className="px-4 py-2">
      <p className="text-xs font-semibold text-gray-500 mb-2">Variáveis detectadas: {variables.length}</p>
      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {variables.map(v => (
          <div key={v.key} className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-600 w-24 truncate">{'{'}{'{'}{v.key}{'}'}{'}'}</span>
            <input
              value={v.value}
              onChange={e => onUpdate(v.key, e.target.value)}
              placeholder={v.label}
              className="flex-1 p-1.5 border border-gray-200 rounded text-xs focus:border-[#27A300] focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onApply} className="flex-1 p-1.5 bg-[#27A300] text-white text-xs rounded-lg font-semibold hover:bg-[#1F8A00]">Aplicar</button>
        <button onClick={onRestore} className="flex-1 p-1.5 border border-gray-200 text-xs rounded-lg font-semibold hover:bg-gray-50">Restaurar</button>
      </div>
    </div>
  );
}

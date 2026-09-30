'use client';

import React, { useState } from 'react';
import { Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CacheManager() {
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState('');

  const handleClear = () => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem('editja_templates');
      localStorage.removeItem('editja_canvas_state');
      document.cookie.split(';').forEach(c => {
        const [name] = c.trim().split('=');
        if (name?.startsWith('sb-') || name?.startsWith('supabase-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      setCleared(true);
      setError('');
      setTimeout(() => setCleared(false), 3000);
    } catch (e) {
      setError('Erro ao limpar cache');
    }
  };

  return (
    <div className="p-4 bento-card">
      <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4" />
        Cache Local
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Limpa dados locais do Supabase e templates armazenados no navegador.
      </p>
      <button
        onClick={handleClear}
        className="clay-button px-4 py-2 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
      >
        {cleared ? 'Cache Limpo' : 'Limpar Cache'}
      </button>
      {cleared && (
        <span className="flex items-center gap-1 text-xs text-green-600 mt-2">
          <CheckCircle2 className="w-3 h-3" /> Cache limpo com sucesso
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-600 mt-2">
          <AlertCircle className="w-3 h-3" /> {error}
        </span>
      )}
    </div>
  );
}

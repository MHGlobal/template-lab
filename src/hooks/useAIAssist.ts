'use client';

import { useCallback, useState } from 'react';

export function useAIAssist() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rewriteText = useCallback(async (text: string, style: string): Promise<string> => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      });
      if (!res.ok) throw new Error('Falha ao reescrever');
      const data = await res.json();
      return data.text || text;
    } catch (e: any) {
      setError(e.message || 'Erro ao reescrever');
      return text;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateText = useCallback(async (prompt: string): Promise<string> => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Falha ao gerar');
      const data = await res.json();
      return data.text || '';
    } catch (e: any) {
      setError(e.message || 'Erro ao gerar');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  return { rewriteText, generateText, loading, error };
}

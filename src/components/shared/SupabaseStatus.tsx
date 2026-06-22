'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setStatus('offline');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseKey },
      signal: controller.signal,
    })
      .then(res => setStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
      .finally(() => clearTimeout(timeout));

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  const config = {
    online: { icon: Wifi, text: 'Online', cls: 'text-green-600 bg-green-50' },
    offline: { icon: WifiOff, text: 'Offline', cls: 'text-red-600 bg-red-50' },
    checking: { icon: Loader2, text: 'Verificando...', cls: 'text-gray-500 bg-gray-50' },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.cls}`}>
      <Icon className={`w-3 h-3 ${status === 'checking' ? 'animate-spin' : ''}`} />
      {config.text}
    </span>
  );
}

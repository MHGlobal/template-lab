'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function PWAPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border p-4 w-72">
      <button onClick={() => setShow(false)} className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-lg"><X className="w-3 h-3" /></button>
      <p className="text-sm font-bold mb-2">Instalar Editja</p>
      <p className="text-xs text-gray-500 mb-3">Instala como app para acesso rápido</p>
      <button onClick={handleInstall} className="w-full bg-[#27A300] text-white text-sm font-bold py-2 rounded-xl hover:bg-[#1f8a00] transition-colors">Instalar</button>
    </div>
  );
}

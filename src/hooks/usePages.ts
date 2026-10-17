'use client';

import { useState, useCallback } from 'react';

export interface Page {
  id: string;
  name: string;
  fabricJson: any;
  background: string;
  width: number;
  height: number;
}

let pageCounter = 1;
function genId() { return `page-${pageCounter++}`; }

export function usePages(initialWidth = 1080, initialHeight = 1080) {
  const [pages, setPages] = useState<Page[]>([
    { id: genId(), name: 'Pagina 1', fabricJson: null, background: '#FFFFFF', width: initialWidth, height: initialHeight },
  ]);
  const [activePageId, setActivePageId] = useState(pages[0]?.id || 'page-1');

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  const addPage = useCallback(() => {
    const p: Page = { id: genId(), name: `Pagina ${pages.length + 1}`, fabricJson: null, background: '#FFFFFF', width: activePage?.width || initialWidth, height: activePage?.height || initialHeight };
    setPages(prev => [...prev, p]);
    setActivePageId(p.id);
  }, [pages.length, activePage, initialWidth, initialHeight]);

  const removePage = useCallback((id: string) => {
    if (pages.length <= 1) return;
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === id);
      const next = prev.filter(p => p.id !== id);
      if (activePageId === id) setActivePageId(next[Math.min(idx, next.length - 1)].id);
      return next;
    });
  }, [pages.length, activePageId]);

  const duplicatePage = useCallback((id: string) => {
    setPages(prev => {
      const src = prev.find(p => p.id === id);
      if (!src) return prev;
      const copy: Page = { ...src, id: genId(), name: `${src.name} (copia)`, fabricJson: src.fabricJson ? JSON.parse(JSON.stringify(src.fabricJson)) : null };
      const idx = prev.findIndex(p => p.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const renamePage = useCallback((id: string, name: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const switchPage = useCallback((id: string) => {
    setActivePageId(id);
  }, []);

  const saveCurrentPage = useCallback((fabricJson: any) => {
    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, fabricJson } : p));
  }, [activePageId]);

  return { pages, activePage, activePageId, addPage, removePage, duplicatePage, renamePage, switchPage, saveCurrentPage };
}

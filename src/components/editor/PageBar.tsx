'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Page } from '@/hooks/usePages';

export default function PageBar({
  pages, activePageId, onSwitch, onAdd, onRemove, onDuplicate, onRename,
}: {
  pages: Page[];
  activePageId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (menuId && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setMenuPos(null);
    }
  }, [menuId]);

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-t border-gray-200 overflow-x-auto">
      {pages.map(p => {
        const btnClass = 'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ' + (p.id === activePageId ? 'bg-[#27A300]/10 text-[#27A300] font-semibold' : 'text-gray-600 hover:bg-gray-100');
        return (
          <div key={p.id} className="relative flex items-center gap-1 shrink-0">
            <button onClick={() => onSwitch(p.id)} className={btnClass}>
              <span className="w-4 h-4 rounded border border-current flex items-center justify-center text-[8px] font-bold">&#9633;</span>
              {editingId === p.id ? (
                <input autoFocus defaultValue={p.name} onBlur={e => { onRename(p.id, e.target.value); setEditingId(null); }} onKeyDown={e => { if (e.key === 'Enter') { onRename(p.id, (e.target as HTMLInputElement).value); setEditingId(null); } }} className="w-20 p-0 border-b border-gray-300 text-xs focus:outline-none" onClick={e => e.stopPropagation()} />
              ) : (
                <span onDoubleClick={() => setEditingId(p.id)}>{p.name}</span>
              )}
            </button>
            <button ref={menuId === p.id ? menuRef : null} onClick={() => setMenuId(menuId === p.id ? null : p.id)} className="p-1 text-gray-400 hover:text-gray-600 text-xs">&#8942;</button>
            {menuId === p.id && menuPos && createPortal(
              <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl text-xs w-32" style={{ top: menuPos.top, left: menuPos.left }}>
                <button onClick={() => { setMenuId(null); setEditingId(p.id); }} className="w-full px-3 py-1.5 text-left hover:bg-gray-50">Renomear</button>
                <button onClick={() => { onDuplicate(p.id); setMenuId(null); }} className="w-full px-3 py-1.5 text-left hover:bg-gray-50">Duplicar</button>
                <button onClick={() => { onRemove(p.id); setMenuId(null); }} className={"w-full px-3 py-1.5 text-left " + (pages.length <= 1 ? 'text-gray-300' : 'text-red-500 hover:bg-red-50')} disabled={pages.length <= 1}>Remover</button>
              </div>,
              document.body
            )}
          </div>
        );
      })}
      <button onClick={onAdd} className="px-2 py-1.5 text-gray-400 hover:text-[#27A300] text-lg leading-none shrink-0">+</button>
    </div>
  );
}

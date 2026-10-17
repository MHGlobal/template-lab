'use client';

import React, { useState } from 'react';
import { MessageCircle, Check, Trash2, X } from 'lucide-react';
import type { Comment } from '@/hooks/useComments';

interface CommentToolProps {
  comments: Comment[];
  onAdd: (text: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function CommentTool({ comments, onAdd, onResolve, onDelete, onClose }: CommentToolProps) {
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center pb-[15vh] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl w-80 pointer-events-auto overflow-hidden border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-xs font-bold flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5" /> Comentários</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-3 h-3" /></button>
        </div>
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {comments.length === 0 && <p className="text-[10px] text-gray-400 text-center py-3">Sem comentários</p>}
          {comments.map(c => (
            <div key={c.id} className={`p-2 rounded-lg text-xs ${c.resolved ? 'bg-gray-50 opacity-60' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <span className="font-bold text-gray-700 shrink-0">{c.author}</span>
                <span className="flex-1 text-gray-600">{c.text}</span>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1">
                {!c.resolved && <button onClick={() => onResolve(c.id)} className="p-0.5 hover:text-green-600"><Check className="w-3 h-3" /></button>}
                <button onClick={() => onDelete(c.id)} className="p-0.5 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Comentar..." className="flex-1 border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#27A300]" />
          <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }} className="px-3 py-1.5 bg-[#27A300] text-white text-xs font-bold rounded-lg hover:bg-[#1f8a00]">Enviar</button>
        </div>
      </div>
    </div>
  );
}

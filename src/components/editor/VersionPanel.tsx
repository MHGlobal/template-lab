'use client';

import React, { useState } from 'react';
import { History, RotateCcw, Trash2, Edit3, Camera, Check, X } from 'lucide-react';
import type { Snapshot } from '@/hooks/useVersioning';

interface VersionPanelProps {
  snapshots: Snapshot[];
  onTakeSnapshot: (name: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function VersionPanel({ snapshots, onTakeSnapshot, onRestore, onDelete, onRename }: VersionPanelProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-500" />
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex-1">Versões</h3>
      </div>
      <div className="flex gap-1 mb-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nome do snapshot"
          className="flex-1 border rounded-lg px-2 py-1 text-xs outline-none focus:border-[#27A300]"
        />
        <button
          onClick={() => { if (newName.trim()) { onTakeSnapshot(newName.trim()); setNewName(''); } }}
          className="p-1.5 bg-[#27A300] text-white rounded-lg hover:bg-[#1f8a00]"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {snapshots.length === 0 && (
          <p className="text-[10px] text-gray-400 text-center py-4">Nenhuma versão guardada</p>
        )}
        {snapshots.map(snap => (
          <div key={snap.id} className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 rounded-lg text-xs group">
            {editingId === snap.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="flex-1 border rounded px-1.5 py-0.5 text-xs outline-none"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') { onRename(snap.id, editName); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span className="flex-1 truncate font-medium text-gray-700">{snap.name}</span>
            )}
            <span className="text-[9px] text-gray-400">{new Date(snap.createdAt).toLocaleTimeString()}</span>
            <button onClick={() => onRestore(snap.id)} className="p-0.5 hover:text-[#27A300]"><RotateCcw className="w-3 h-3" /></button>
            <button onClick={() => { setEditingId(snap.id); setEditName(snap.name); }} className="p-0.5 hover:text-blue-500"><Edit3 className="w-3 h-3" /></button>
            <button onClick={() => onDelete(snap.id)} className="p-0.5 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

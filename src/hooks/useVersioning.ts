'use client';

import { useState, useCallback, useRef } from 'react';

export interface Snapshot {
  id: string;
  name: string;
  data: string;
  createdAt: number;
}

export function useVersioning() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const maxSnapshots = useRef(20);

  const takeSnapshot = useCallback((name: string, json: string) => {
    const snapshot: Snapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      data: json,
      createdAt: Date.now(),
    };
    setSnapshots(prev => {
      const next = [snapshot, ...prev];
      if (next.length > maxSnapshots.current) next.pop();
      return next;
    });
    return snapshot.id;
  }, []);

  const restoreSnapshot = useCallback((id: string): string | null => {
    const snap = snapshots.find(s => s.id === id);
    return snap ? snap.data : null;
  }, [snapshots]);

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameSnapshot = useCallback((id: string, name: string) => {
    setSnapshots(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  return { snapshots, takeSnapshot, restoreSnapshot, deleteSnapshot, renameSnapshot };
}

'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ActiveObjectProps } from '@/hooks/useEditor';

interface SelectionState {
  activeProps: ActiveObjectProps | null;
  selectedIds: string[];
  hoveredId: string | null;
  setActiveProps: (props: ActiveObjectProps | null) => void;
  setSelectedIds: (ids: string[]) => void;
  setHoveredId: (id: string | null) => void;
  clearSelection: () => void;
}

const Ctx = createContext<SelectionState | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [activeProps, setActiveProps] = useState<ActiveObjectProps | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setActiveProps(null);
    setSelectedIds([]);
  }, []);

  const value: SelectionState = {
    activeProps, selectedIds, hoveredId,
    setActiveProps, setSelectedIds, setHoveredId, clearSelection,
  };

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useSelectionStore(): SelectionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSelectionStore must be used within SelectionProvider');
  return ctx;
}

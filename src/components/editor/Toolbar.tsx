'use client';

import React, { useState } from 'react';
import {
  MousePointer2, Square, Circle, Triangle, Minus, Hexagon, Star,
  Type, PenTool, Image, Grid3x3, Egg, ArrowRight, CornerDownRight,
  Heart, MessageCircle, Pentagon, Hand,
} from 'lucide-react';
import type { ToolId } from '@/hooks/useEditor';

interface ToolbarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onAddText: () => void;
  onAddImage: (url: string) => void;
  onToggleFreeDrawing: () => void;
  onToggleGrid: () => void;
  isGridVisible: boolean;
  isDrawingMode: boolean;
}

interface ToolItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action?: string;
  toggle?: boolean;
  isImageUpload?: boolean;
}

const toolGroups: { label: string; tools: ToolItem[] }[] = [
  {
    label: 'Seleção',
    tools: [
      { id: 'select', icon: MousePointer2, label: 'Selecionar (V)' },
      { id: 'pan', icon: Hand, label: 'Mão/Pan (H)' },
    ],
  },
  {
    label: 'Formas',
    tools: [
      { id: 'rect', icon: Square, label: 'Rectângulo (R)' },
      { id: 'circle', icon: Circle, label: 'Círculo (C)' },
      { id: 'triangle', icon: Triangle, label: 'Triângulo' },
      { id: 'ellipse', icon: Egg, label: 'Elipse' },
      { id: 'rounded-rect', icon: CornerDownRight, label: 'Rect. Arredondado' },
      { id: 'polygon', icon: Hexagon, label: 'Polígono' },
      { id: 'star', icon: Star, label: 'Estrela' },
      { id: 'heart', icon: Heart, label: 'Coração' },
      { id: 'speech-bubble', icon: MessageCircle, label: 'Balão' },
      { id: 'pentagon', icon: Pentagon, label: 'Pentágono' },
      { id: 'line', icon: Minus, label: 'Linha (L)' },
      { id: 'arrow', icon: ArrowRight, label: 'Seta' },
      { id: 'dashed-line', icon: Minus, label: 'Linha Tracejada' },
    ],
  },
  {
    label: 'Texto',
    tools: [
      { id: 'text', icon: Type, label: 'Texto (T)', action: 'onAddText' },
    ],
  },
  {
    label: 'Desenho',
    tools: [
      { id: 'free-draw', icon: PenTool, label: 'Desenho Livre (D)', action: 'onToggleFreeDrawing', toggle: true },
    ],
  },
  {
    label: 'Mídia',
    tools: [
      { id: 'image', icon: Image, label: 'Upload Imagem (I)', isImageUpload: true },
    ],
  },
  {
    label: 'Ferramentas',
    tools: [
      { id: 'grid', icon: Grid3x3, label: 'Grade (G)', action: 'onToggleGrid', toggle: true },
    ],
  },
];

export default function Toolbar({
  activeTool, onSelectTool,
  onAddText, onAddImage,
  onToggleFreeDrawing, onToggleGrid,
  isGridVisible, isDrawingMode,
}: ToolbarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderBtn = (item: ToolItem) => {
    const Icon = item.icon;
    const isActive = item.id === 'grid'
      ? isGridVisible
      : item.id === 'free-draw'
        ? isDrawingMode
        : activeTool === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          if (item.isImageUpload) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) onAddImage(URL.createObjectURL(file));
            };
            input.click();
          } else if (item.action === 'onAddText') {
            onAddText();
          } else if (item.action === 'onToggleFreeDrawing') {
            onToggleFreeDrawing();
          } else if (item.action === 'onToggleGrid') {
            onToggleGrid();
          } else {
            onSelectTool(item.id as ToolId);
          }
        }}
        title={item.label}
        className={`group relative p-1.5 rounded-lg transition-all active:scale-95 ${
          isActive
            ? 'bg-green-100 text-[#27A300] shadow-sm ring-1 ring-green-300'
            : 'hover:bg-green-50 hover:text-[#27A300] text-gray-500'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="absolute left-full ml-2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-0.5 shadow-sm h-full select-none overflow-y-auto overflow-x-hidden">
      {toolGroups.map((group) => {
        const isCollapsed = collapsed[group.label];
        return (
          <div key={group.label} className="w-full px-1.5 mb-1">
            <button
              onClick={() => toggleCollapse(group.label)}
              className="w-full text-[9px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 py-1 text-center"
              title={isCollapsed ? `Mostrar ${group.label}` : `Ocultar ${group.label}`}
            >
              {isCollapsed ? '···' : group.label}
            </button>
            {!isCollapsed && (
              <div className="flex flex-col items-center gap-0.5">
                {group.tools.map(renderBtn)}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

'use client';

import React from 'react';
import {
  MousePointer2, Square, Circle, Triangle, Minus, Hexagon, Star,
  Type, PenTool, Image, Grid3x3, Egg, ArrowRight, CornerDownRight,
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

const shapeTools: { id: ToolId; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selecionar (V)' },
  { id: 'rect', icon: Square, label: 'Rectângulo (R)' },
  { id: 'circle', icon: Circle, label: 'Círculo (C)' },
  { id: 'triangle', icon: Triangle, label: 'Triângulo' },
  { id: 'ellipse', icon: Egg, label: 'Elipse' },
  { id: 'rounded-rect', icon: CornerDownRight, label: 'Rect. Arredondado' },
  { id: 'line', icon: Minus, label: 'Linha (L)' },
  { id: 'arrow', icon: ArrowRight, label: 'Seta' },
  { id: 'polygon', icon: Hexagon, label: 'Polígono' },
  { id: 'star', icon: Star, label: 'Estrela' },
];

const actionTools = [
  { id: 'text', icon: Type, label: 'Texto (T)', action: 'onAddText' as const },
  { id: 'free-draw', icon: PenTool, label: 'Desenho Livre (D)', action: 'onToggleFreeDrawing' as const, toggle: true },
  { id: 'image', icon: Image, label: 'Upload Imagem (I)', action: null, isImageUpload: true },
  { id: 'grid', icon: Grid3x3, label: 'Grade (G)', action: 'onToggleGrid' as const, toggle: true, activeToggle: false },
];

export default function Toolbar({
  activeTool, onSelectTool,
  onAddText, onAddImage,
  onToggleFreeDrawing, onToggleGrid,
  isGridVisible, isDrawingMode,
}: ToolbarProps) {
  return (
    <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1.5 shadow-sm h-full select-none">
      {shapeTools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onSelectTool(id)}
          title={label}
          className={`group relative p-2 rounded-lg transition-all active:scale-95 ${
            activeTool === id
              ? 'bg-green-100 text-[#27A300] shadow-sm ring-1 ring-green-300'
              : 'hover:bg-green-50 hover:text-[#27A300] text-gray-500'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
            {label}
          </span>
        </button>
      ))}

      <div className="w-7 h-px bg-gray-200 my-1" />

      {actionTools.map(({ id, icon: Icon, label, action, isImageUpload }) => {
        const isActive = id === 'grid' ? isGridVisible : id === 'free-draw' ? isDrawingMode : false;
        return (
          <button
            key={id}
            onClick={() => {
              if (isImageUpload) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) onAddImage(URL.createObjectURL(file));
                };
                input.click();
              } else if (action === 'onAddText') {
                onAddText();
              } else if (action === 'onToggleFreeDrawing') {
                onToggleFreeDrawing();
              } else if (action === 'onToggleGrid') {
                onToggleGrid();
              }
            }}
            title={label}
            className={`group relative p-2 rounded-lg transition-all active:scale-95 ${
              isActive
                ? 'bg-green-100 text-[#27A300] shadow-sm ring-1 ring-green-300'
                : 'hover:bg-green-50 hover:text-[#27A300] text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
              {label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

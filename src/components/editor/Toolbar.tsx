'use client';

import React from 'react';
import {
  Square, Circle, Triangle, Minus, Hexagon, Star,
  Type, PenTool, Image, Grid3x3,
} from 'lucide-react';

interface ToolbarProps {
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddLine: () => void;
  onAddPolygon: () => void;
  onAddStar: () => void;
  onAddText: () => void;
  onToggleFreeDrawing: () => void;
  onAddImage: (url: string) => void;
  onToggleGrid: () => void;
  isGridVisible: boolean;
  isDrawingMode: boolean;
}

const tools = [
  { id: 'rect', icon: Square, label: 'Rectângulo (R)', action: 'onAddRect' as const },
  { id: 'circle', icon: Circle, label: 'Círculo (C)', action: 'onAddCircle' as const },
  { id: 'triangle', icon: Triangle, label: 'Triângulo', action: 'onAddTriangle' as const },
  { id: 'line', icon: Minus, label: 'Linha (L)', action: 'onAddLine' as const },
  { id: 'polygon', icon: Hexagon, label: 'Polígono', action: 'onAddPolygon' as const },
  { id: 'star', icon: Star, label: 'Estrela', action: 'onAddStar' as const },
];

const toolsBottom = [
  { id: 'text', icon: Type, label: 'Texto (T)', action: 'onAddText' as const },
  { id: 'free-draw', icon: PenTool, label: 'Desenho Livre (D)', action: 'onToggleFreeDrawing' as const, toggle: true },
  { id: 'image', icon: Image, label: 'Upload Imagem (I)', action: null, isImageUpload: true },
  { id: 'grid', icon: Grid3x3, label: 'Grade (G)', action: 'onToggleGrid' as const, toggle: true },
];

export default function Toolbar({
  onAddRect, onAddCircle, onAddTriangle, onAddLine,
  onAddPolygon, onAddStar, onAddText,
  onToggleFreeDrawing, onAddImage, onToggleGrid,
  isGridVisible, isDrawingMode,
}: ToolbarProps) {
  const handleAction = (action: typeof tools[number]['action'] | typeof toolsBottom[number]['action']) => {
    if (!action) return;
    const fn = { onAddRect, onAddCircle, onAddTriangle, onAddLine, onAddPolygon, onAddStar, onAddText, onToggleFreeDrawing, onToggleGrid }[action];
    if (fn) fn();
  };

  return (
    <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1.5 shadow-sm h-full select-none">
      {tools.map(({ id, icon: Icon, label, action }) => (
        <button
          key={id}
          onClick={() => handleAction(action)}
          title={label}
          className="group relative p-2 rounded-lg hover:bg-green-50 hover:text-[#27A300] text-gray-500 transition-all active:scale-95"
        >
          <Icon className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
            {label}
          </span>
        </button>
      ))}

      <div className="w-7 h-px bg-gray-200 my-1" />

      {toolsBottom.map(({ id, icon: Icon, label, action, toggle, isImageUpload }) => {
        const isActive = toggle && (id === 'grid' ? isGridVisible : id === 'free-draw' ? isDrawingMode : false);
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
              } else if (action) {
                handleAction(action);
              }
            }}
            title={label}
            className={`group relative p-2 rounded-lg transition-all active:scale-95 ${
              isActive
                ? 'bg-green-100 text-[#27A300] shadow-sm'
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

'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Layers, Eye, EyeOff, Lock, Unlock, GripVertical, ChevronRight, ChevronDown,
  Square, Type, Image as ImageIcon, Minus, Hexagon, Group,
} from 'lucide-react';
import type { FabricObject } from 'fabric';

interface LayerItem {
  obj: FabricObject;
  index: number;
}

interface LayerPanelProps {
  objects: LayerItem[];
  activeObject: FabricObject | null;
  hoveredObject?: FabricObject | null;
  onSelectObject: (obj: FabricObject) => void;
  onToggleVisibility: (obj: FabricObject) => void;
  onToggleLock: (obj: FabricObject) => void;
  onReorder: (obj: FabricObject, newIndex: number) => void;
  onDeleteObject?: (obj: FabricObject) => void;
}

function getLayerIcon(type: string) {
  switch (type) {
    case 'rect': case 'triangle': case 'circle': case 'ellipse': case 'rounded-rect':
      return Square;
    case 'i-text': case 'textbox':
      return Type;
    case 'image':
      return ImageIcon;
    case 'line': case 'arrow': case 'dashed-line':
      return Minus;
    case 'polygon': case 'star': case 'heart': case 'pentagon':
      return Hexagon;
    case 'group':
      return Group;
    default:
      return Square;
  }
}

const TYPE_LABELS: Record<string, string> = {
  rect: 'Rectângulo', circle: 'Círculo', triangle: 'Triângulo',
  ellipse: 'Elipse', 'rounded-rect': 'Rect. Arredondado',
  line: 'Linha', arrow: 'Seta', 'dashed-line': 'Linha Trac.',
  polygon: 'Polígono', star: 'Estrela', heart: 'Coração',
  pentagon: 'Pentágono', 'speech-bubble': 'Balão',
  'i-text': 'Texto', textbox: 'Texto',
  image: 'Imagem', group: 'Grupo',
};

function getLayerLabel(obj: FabricObject) {
  const named = (obj as any).name;
  if (named) return named;
  const t = (obj as any).data?.type || obj.type || 'unknown';
  return TYPE_LABELS[t] || t;
}

function isGrid(obj: FabricObject) {
  return (obj as any).data?.type === 'grid';
}

function isGroup(obj: FabricObject) {
  return obj.type === 'group';
}

function getChildren(obj: FabricObject): FabricObject[] {
  return (obj as any)._objects || [];
}

export default function LayerPanel({
  objects, activeObject, hoveredObject, onSelectObject,
  onToggleVisibility, onToggleLock, onReorder,
}: LayerPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const dropTargetRef = useRef<number | null>(null);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = objects.filter(item => !isGrid(item.obj));

  const handleDragStart = (index: number) => { setDragIndex(index); };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); dropTargetRef.current = index; };
  const handleDrop = () => {
    if (dragIndex === null || dropTargetRef.current === null) return;
    if (dragIndex !== dropTargetRef.current) {
      const obj = objects.find(o => o.index === dragIndex)?.obj;
      if (obj) onReorder(obj, dropTargetRef.current);
    }
    setDragIndex(null);
    dropTargetRef.current = null;
  };
  const handleDragEnd = () => { setDragIndex(null); dropTargetRef.current = null; };

  const getGroupKey = (obj: FabricObject, index: number) => `${index}-${(obj as any).data?.id || ''}`;

  const renderChildren = (children: FabricObject[], parentIdx: number, depth: number) => {
    if (!children.length) return null;
    return children.map((child, ci) => {
      const childKey = `child-${parentIdx}-${ci}`;
      const isActive = activeObject === child;
      return (
        <div
          key={childKey}
          onClick={() => onSelectObject(child)}
          className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors text-xs ${
            isActive ? 'bg-green-50 border-l-2 border-l-[#27A300]' : hoveredObject === child ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[#27A300]' : 'bg-gray-300'}`} />
          <span className="flex-1 truncate text-gray-600">{getLayerLabel(child)}</span>
          <span className="text-[9px] text-gray-400 uppercase shrink-0">{child.type || '?'}</span>
        </div>
      );
    });
  };

  return (
    <aside className="w-72 bg-white border-l border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 shrink-0">
        <h2 className="text-xs font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Camadas
          <span className="text-gray-400 font-normal normal-case ml-auto">{filtered.length}</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-xs text-gray-400">Nenhum objeto no canvas</p>
          </div>
        ) : (
          [...filtered].reverse().map((item) => {
            const realIdx = item.index;
            const obj = item.obj;
            const isActive = activeObject === obj;
            const isDragging = dragIndex === realIdx;
            const vis = (obj as any).visible !== false;
            const locked = (obj as any).lockMovementX === true;
            const grp = isGroup(obj);
            const grpKey = getGroupKey(obj, realIdx);
            const isExpanded = expandedGroups.has(grpKey);
            const children = grp ? getChildren(obj) : [];
            const Icon = getLayerIcon(obj.type || '');

            return (
              <div key={grpKey}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(realIdx)}
                  onDragOver={(e) => handleDragOver(e, realIdx)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectObject(obj)}
                  className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 cursor-pointer transition-colors text-xs ${
                    isActive ? 'bg-green-50 border-l-2 border-l-[#27A300]' : hoveredObject === obj ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${isDragging ? 'opacity-50' : ''}`}
                >
                  {grp && (
                    <button onClick={(e) => { e.stopPropagation(); toggleGroup(grpKey); }} className="p-0.5 text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                  )}
                  {!grp && <GripVertical className="w-3 h-3 text-gray-300 shrink-0 cursor-grab" />}
                  <Icon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  <span className="flex-1 truncate font-medium text-gray-700">
                    {getLayerLabel(obj)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj); }}
                    className={`p-0.5 rounded transition-colors ${vis ? 'text-gray-400 hover:text-gray-600' : 'text-red-400'}`}
                    title={vis ? 'Ocultar' : 'Mostrar'}
                  >
                    {vis ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(obj); }}
                    className={`p-0.5 rounded transition-colors ${locked ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title={locked ? 'Destravar' : 'Travar'}
                  >
                    {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
                {grp && isExpanded && renderChildren(children, realIdx, 1)}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

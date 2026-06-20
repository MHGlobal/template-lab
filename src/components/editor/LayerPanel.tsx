'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, GripVertical } from 'lucide-react';
import type { FabricObject, ObjectEvents } from 'fabric';

interface LayerItem {
  obj: FabricObject;
  index: number;
}

interface LayerPanelProps {
  objects: LayerItem[];
  activeObject: FabricObject | null;
  onSelectObject: (obj: FabricObject) => void;
  onToggleVisibility: (obj: FabricObject) => void;
  onToggleLock: (obj: FabricObject) => void;
  onReorder: (obj: FabricObject, newIndex: number) => void;
  onDeleteObject?: (obj: FabricObject) => void;
}

export default function LayerPanel({
  objects, activeObject, onSelectObject,
  onToggleVisibility, onToggleLock, onReorder, onDeleteObject,
}: LayerPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const getLayerName = useCallback((obj: FabricObject) => {
    const named = (obj as any).name;
    if (named) return named;
    const type = (obj as any).data?.type || obj.type;
    return type || 'unknown';
  }, []);

  const getLayerTypeIcon = useCallback((obj: FabricObject) => {
    const gridCheck = (obj as any).data?.type === 'grid';
    if (gridCheck) return 'grid';
    if ((obj as any).data?.type === 'grid') return 'grid';
    const type = obj.type;
    if (type === 'rect' || type === 'triangle' || type === 'circle' || type === 'ellipse') return 'shape';
    if (type === 'i-text' || type === 'textbox') return 'text';
    if (type === 'image') return 'image';
    if (type === 'group') return 'group';
    if (type === 'line') return 'line';
    if (type === 'polygon') return 'polygon';
    if (type === 'activeSelection') return 'selection';
    return 'unknown';
  }, []);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex.current === null) return;
    if (dragIndex === dragOverIndex.current) return;
    const obj = objects[dragIndex]?.obj;
    if (obj) onReorder(obj, dragOverIndex.current);
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  return (
    <aside className="w-60 bg-white border-l border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100 shrink-0">
        <h2 className="text-xs font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Camadas
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-xs text-gray-400">Nenhum objeto no canvas</p>
          </div>
        ) : (
          [...objects].reverse().map((item, displayIdx) => {
            const realIdx = item.index;
            const isActive = activeObject === item.obj;
            const isDragging = dragIndex === realIdx;
            const vis = (item.obj as any).visible !== false;
            const locked = (item.obj as any).lockMovementX === true;
            const isGrid = (item.obj as any).data?.type === 'grid';

            return (
              <div
                key={`${realIdx}-${(item.obj as any).data?.id || realIdx}`}
                draggable={!isGrid}
                onDragStart={() => handleDragStart(realIdx)}
                onDragOver={(e) => handleDragOver(e, realIdx)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectObject(item.obj)}
                className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 cursor-pointer transition-colors text-xs ${
                  isActive ? 'bg-green-50 border-l-2 border-l-[#27A300]' : 'hover:bg-gray-50'
                } ${isDragging ? 'opacity-50' : ''} ${isGrid ? 'cursor-default opacity-60' : ''}`}
              >
                {!isGrid && <GripVertical className="w-3 h-3 text-gray-300 shrink-0 cursor-grab" />}
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[#27A300]' : 'bg-gray-300'}`} />
                <span className="flex-1 truncate font-medium text-gray-700 capitalize">
                  {getLayerName(item.obj)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase shrink-0">{getLayerTypeIcon(item.obj)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(item.obj); }}
                  className={`p-1 rounded transition-colors ${vis ? 'text-gray-400 hover:text-gray-600' : 'text-red-400'}`}
                  title={vis ? 'Ocultar' : 'Mostrar'}
                >
                  {vis ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                {!isGrid && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(item.obj); }}
                    className={`p-1 rounded transition-colors ${locked ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title={locked ? 'Destravar' : 'Travar'}
                  >
                    {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

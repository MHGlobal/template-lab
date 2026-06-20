'use client';

import React from 'react';
import {
  Layers, Move, Maximize, PaintBucket, Minus, Droplets,
  AlignLeft, AlignCenter, AlignRight, Type,
} from 'lucide-react';
import type { ActiveObjectProps } from '@/hooks/useEditor';

interface PropertyPanelProps {
  activeProps: ActiveObjectProps | null;
  onSetFill: (color: string) => void;
  onSetStroke: (color: string) => void;
  onSetStrokeWidth: (width: number) => void;
  onSetOpacity: (value: number) => void;
  onSetPosition: (left: number, top: number) => void;
  onSetSize: (width: number, height: number) => void;
  onSetFontFamily: (font: string) => void;
  onSetFontSize: (size: number) => void;
  onSetFontWeight: (weight: string) => void;
  onSetTextAlign: (align: string) => void;
  onSetTextContent: (text: string) => void;
  onApplyImageFilter: (filter: string) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
}

export default function PropertyPanel({
  activeProps, onSetFill, onSetStroke, onSetStrokeWidth,
  onSetOpacity, onSetPosition, onSetSize,
  onSetFontFamily, onSetFontSize, onSetFontWeight, onSetTextAlign, onSetTextContent,
  onApplyImageFilter, onBringToFront, onSendToBack, onDelete,
  onGroup, onUngroup,
}: PropertyPanelProps) {
  if (!activeProps) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 shadow-sm h-full flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            Propriedades
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
            <Move className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Selecione um elemento para editar</p>
        </div>
      </aside>
    );
  }

  const isText = activeProps.type === 'i-text';
  const isImage = activeProps.type === 'image';

  return (
    <aside className="w-72 bg-white border-l border-gray-200 shadow-sm h-full flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Propriedades
        </h2>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-[10px] font-bold text-[#005C00] uppercase tracking-wider mb-0.5">Tipo</p>
          <p className="font-bold text-gray-800 text-sm capitalize">
            {activeProps.type === 'i-text' ? 'Texto' : activeProps.type || 'Objeto'}
          </p>
        </div>
      </div>

      {/* Layers quick actions */}
      <div className="px-4 pb-3 flex gap-1">
        <button onClick={onBringToFront} title="Para a frente" className="flex-1 p-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          Frente
        </button>
        <button onClick={onSendToBack} title="Para trás" className="flex-1 p-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          Trás
        </button>
        <button onClick={onDelete} title="Eliminar" className="flex-1 p-1.5 border border-red-200 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors">
          Eliminar
        </button>
      </div>
      {activeProps.type === 'group' && onUngroup && (
        <div className="px-4 pb-3">
          <button onClick={onUngroup} className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Desagrupar
          </button>
        </div>
      )}
      {onGroup && !activeProps.type?.includes('group') && (
        <div className="px-4 pb-3">
          <button onClick={onGroup} className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Agrupar seleção
          </button>
        </div>
      )}

      {/* Position */}
      <Section title="Posição" icon={Move}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={activeProps.left} onChange={v => onSetPosition(v, activeProps.top)} />
          <NumberField label="Y" value={activeProps.top} onChange={v => onSetPosition(activeProps.left, v)} />
        </div>
      </Section>

      {/* Size */}
      <Section title="Tamanho" icon={Maximize}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Largura" value={activeProps.width} onChange={v => onSetSize(v, activeProps.height)} />
          <NumberField label="Altura" value={activeProps.height} onChange={v => onSetSize(activeProps.width, v)} />
        </div>
      </Section>

      {/* Fill */}
      <Section title="Preenchimento" icon={PaintBucket}>
        <ColorField value={activeProps.fill} onChange={onSetFill} />
      </Section>

      {/* Stroke */}
      <Section title="Contorno" icon={Minus}>
        <div className="flex items-center gap-2">
          <ColorField value={activeProps.stroke} onChange={onSetStroke} />
          <div className="flex-1">
            <NumberField label="px" value={activeProps.strokeWidth} onChange={onSetStrokeWidth} min={0} max={50} />
          </div>
        </div>
      </Section>

      {/* Opacity */}
      <Section title="Opacidade" icon={Droplets}>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={1} step={0.01}
            value={activeProps.opacity}
            onChange={e => onSetOpacity(parseFloat(e.target.value))}
            className="flex-1 accent-[#27A300] h-1.5"
          />
          <span className="text-xs font-bold text-gray-600 min-w-[3ch] text-right">
            {Math.round(activeProps.opacity * 100)}%
          </span>
        </div>
      </Section>

      {/* Text Properties */}
      {isText && (
        <div className="border-t border-gray-100 pt-3 mt-1">
          <Section title="Texto" icon={Type}>
            <textarea
              value={activeProps.text || ''}
              onChange={e => onSetTextContent(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#27A300] focus:outline-none mb-3 resize-none"
              rows={3}
            />
            <div className="mb-2.5">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Fonte</label>
              <select
                value={activeProps.fontFamily || 'Inter'}
                onChange={e => onSetFontFamily(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-[#27A300] focus:outline-none"
              >
                {['Arial', 'Inter', 'Poppins', 'Georgia', 'Courier New'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Tamanho</label>
                <input
                  type="number" value={activeProps.fontSize || 24}
                  onChange={e => onSetFontSize(parseInt(e.target.value) || 24)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-[#27A300] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Peso</label>
                <select
                  value={activeProps.fontWeight || 'normal'}
                  onChange={e => onSetFontWeight(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-[#27A300] focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Alinhamento</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => onSetTextAlign(align)}
                    className={`flex-1 p-1.5 border rounded-lg transition-colors ${
                      activeProps.textAlign === align
                        ? 'bg-green-50 text-[#27A300] border-green-200'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5 mx-auto" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5 mx-auto" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Image Filters */}
      {isImage && (
        <div className="border-t border-gray-100 pt-3 mt-1">
          <Section title="Filtros de Imagem" icon={Droplets}>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'brightness', label: 'Brilho' },
                { id: 'contrast', label: 'Contraste' },
                { id: 'sepia', label: 'Sépia' },
                { id: 'grayscale', label: 'Cinza' },
                { id: 'blur', label: 'Desfoque' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => onApplyImageFilter(f.id)}
                  className="p-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-green-50 hover:text-[#27A300] transition-all"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      <div className="h-4" />
    </aside>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="px-4 mb-3">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">{label}</label>
      <input
        type="number"
        value={Math.round(value)}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full p-1.5 border border-gray-200 rounded-lg text-xs focus:border-[#27A300] focus:outline-none"
      />
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 p-0.5 border border-gray-200 rounded-lg cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 p-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:border-[#27A300] focus:outline-none"
      />
    </div>
  );
}

'use client';

import React from 'react';
import type { GradientDef } from '@/hooks/useGradient';

export default function GradientPanel({
  value, onChange, onRemove,
}: {
  value?: GradientDef;
  onChange: (def: GradientDef) => void;
  onRemove: () => void;
}) {
  const def = value || { type: 'linear' as const, angle: 0, colorStops: [{ offset: 0, color: '#FF0000' }, { offset: 1, color: '#0000FF' }] };

  const linearClass = 'flex-1 p-1.5 text-xs rounded-lg border ' + (def.type === 'linear' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200');
  const radialClass = 'flex-1 p-1.5 text-xs rounded-lg border ' + (def.type === 'radial' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => onChange({ ...def, type: 'linear' })} className={linearClass}>Linear</button>
        <button onClick={() => onChange({ ...def, type: 'radial' })} className={radialClass}>Radial</button>
      </div>
      {def.type === 'linear' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Angulo: {def.angle}deg</label>
          <input type="range" min={0} max={360} value={def.angle} onChange={e => onChange({ ...def, angle: parseInt(e.target.value) })} className="w-full accent-[#27A300]" />
        </div>
      )}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {def.colorStops.map((cs, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="color" value={cs.color} onChange={e => { const s = [...def.colorStops]; s[i] = { ...s[i], color: e.target.value }; onChange({ ...def, colorStops: s }); }} className="w-6 h-6 p-0 border rounded cursor-pointer" />
            <input type="number" min={0} max={1} step={0.01} value={cs.offset} onChange={e => { const s = [...def.colorStops]; s[i] = { ...s[i], offset: parseFloat(e.target.value) }; onChange({ ...def, colorStops: s }); }} className="w-16 p-1 border border-gray-200 rounded text-xs" />
            {def.colorStops.length > 2 && (
              <button onClick={() => onChange({ ...def, colorStops: def.colorStops.filter((_, j) => j !== i) })} className="text-xs text-red-500">x</button>
            )}
          </div>
        ))}
      </div>
      {def.colorStops.length < 8 && (
        <button onClick={() => onChange({ ...def, colorStops: [...def.colorStops, { offset: 0.5, color: '#888888' }] })} className="text-xs text-gray-500 hover:text-gray-700">+ Add stop</button>
      )}
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 block">Remover gradiente</button>
    </div>
  );
}

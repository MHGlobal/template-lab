'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FabricTemplate } from '@/types';
import { 
  Trash2, 
  Layers, 
  Type, 
  Image as ImageIcon,
  ChevronLeft,
  Check
} from 'lucide-react';
import Link from 'next/link';

// Dynamically import FabricCanvas with SSR disabled
const FabricCanvas = dynamic(
  () => import('@/components/editor/FabricCanvas').then((mod) => mod.FabricCanvas),
  { ssr: false }
);

export default function ViewerPage() {
  const [template, setTemplate] = useState<FabricTemplate | null>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pending_template');
    if (saved) {
      setTemplate(JSON.parse(saved));
    }
  }, []);

  const handleCanvasReady = (fabricCanvas: any) => {
    setCanvas(fabricCanvas);
    fabricCanvas.on('selection:created', (e: any) => setSelectedObject(e.target || null));
    fabricCanvas.on('selection:updated', (e: any) => setSelectedObject(e.target || null));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (!selectedObject || !canvas) return;
    selectedObject.set(property, value);
    canvas.renderAll();
  };

  const generateThumbnail = () => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'webp', quality: 0.8 });
    console.log('Thumbnail generated', dataUrl);
    alert('Thumbnail gerada com sucesso! (Simulado)');
  };

  const approveTemplate = () => {
    alert('Template Aprovado! Movendo para biblioteca...');
    localStorage.removeItem('pending_template');
    window.location.href = '/';
  };

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-xl font-bold">Nenhum template carregado.</p>
        <Link href="/import" className="clay-button px-6 py-2">Ir para Importação</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#ECFFEB]/30">
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-green-50 rounded-full transition-colors">
            <ChevronLeft />
          </Link>
          <h1 className="font-bold text-lg">{template.name}</h1>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-[#005C00]">
            {template.category}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generateThumbnail}
            className="flex items-center gap-2 px-4 py-2 border border-green-200 rounded-lg hover:bg-green-50 transition-colors text-sm font-bold"
          >
            <ImageIcon size={16} />
            Gerar Thumbnail
          </button>
          <button 
            onClick={approveTemplate}
            className="flex items-center gap-2 px-6 py-2 bg-[#27A300] text-white rounded-lg hover:bg-[#005C00] transition-colors text-sm font-bold shadow-md"
          >
            <Check size={16} />
            Aprovar Template
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar Esquerda */}
        <aside className="w-16 border-r bg-white flex flex-col items-center py-6 gap-6 shrink-0">
          <button className="p-3 bg-green-50 text-[#27A300] rounded-xl"><Layers size={24} /></button>
          <button className="p-3 text-green-800/40 hover:bg-green-50 hover:text-[#27A300] rounded-xl transition-all"><Type size={24} /></button>
          <button className="p-3 text-green-800/40 hover:bg-green-50 hover:text-[#27A300] rounded-xl transition-all"><ImageIcon size={24} /></button>
          <button className="p-3 text-green-800/40 hover:bg-green-50 hover:text-[#27A300] rounded-xl transition-all mt-auto"><Trash2 size={24} /></button>
        </aside>

        {/* Área Central - Canvas */}
        <main className="flex-1 overflow-auto p-12 flex items-center justify-center bg-[#f0f2f0]">
          <FabricCanvas 
            width={template.width} 
            height={template.height} 
            initialJson={template.fabric_json}
            onCanvasReady={handleCanvasReady}
          />
        </main>

        {/* Sidebar Direita - Propriedades */}
        <aside className="w-80 border-l bg-white p-6 shrink-0 overflow-y-auto">
          <h2 className="text-xl font-bold mb-6">Propriedades</h2>
          
          {selectedObject ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs font-bold text-[#005C00] uppercase mb-1">Tipo de Objeto</p>
                <p className="font-bold capitalize text-lg">{selectedObject.type}</p>
              </div>

              {selectedObject.type === 'i-text' || selectedObject.type === 'text' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Texto</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl"
                      value={selectedObject.text || ''}
                      onChange={(e) => handlePropertyChange('text', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Cor</label>
                    <input 
                      type="color" 
                      className="w-full h-10 p-1 border rounded-lg"
                      value={selectedObject.fill as string}
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Tamanho da Fonte</label>
                    <input 
                      type="number" 
                      className="w-full p-3 border rounded-xl"
                      value={selectedObject.fontSize}
                      onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Opacidade</label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1"
                      className="w-full"
                      value={selectedObject.opacity}
                      onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Cor de Preenchimento</label>
                    <input 
                      type="color" 
                      className="w-full h-10 p-1 border rounded-lg"
                      value={selectedObject.fill as string}
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <Layers size={32} />
              </div>
              <p className="text-gray-500 font-medium">Selecione um elemento para editar suas propriedades.</p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t">
             <h3 className="font-bold mb-4">Metadados</h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span className="font-mono">{template.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tamanho:</span>
                  <span className="font-bold">{template.width}x{template.height}</span>
                </div>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Search, Grid, Eye, Trash2, Loader2, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { templateService } from '@/services/templateService';
import type { FabricTemplate } from '@/types';

const categories = ['Todos', 'Social Media', 'Business', 'Events', 'Documents', 'Ecommerce'];

const categoryFilterMap: Record<string, string | null> = {
  'Todos': null,
  'Social Media': 'social-media',
  'Business': 'business',
  'Events': 'events',
  'Documents': 'documents',
  'Ecommerce': 'ecommerce',
};

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [templates, setTemplates] = useState<FabricTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templateService.getTemplates().then(data => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const filterValue = categoryFilterMap[selectedCategory];
  const filtered = filterValue
    ? templates.filter(t => t.category === filterValue)
    : templates;

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('editja_templates', JSON.stringify(updated));
    }
  };

  return (
    <div className="p-8 aurora-bg min-h-screen">
      <header className="mb-10">
        <h1 className="text-4xl font-bold font-jakarta tracking-tight">Biblioteca de Templates</h1>
        <p className="text-green-800/60 mt-2 font-medium">Gerencie e visualize todos os templates aprovados.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/20">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedCategory === cat 
                ? 'bg-[#27A300] text-white shadow-lg' 
                : 'text-green-800/60 hover:bg-green-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-green-800/40" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar templates..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/60 border border-white/20 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-400 font-medium text-lg">Nenhum template encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterValue ? 'Nenhum template nesta categoria.' : 'Importe seu primeiro template para começar.'}
          </p>
          <Link href="/import" className="mt-4 clay-button px-6 py-3 text-sm font-bold">
            Importar Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filtered.map((template) => (
            <div key={template.id} className="bento-card group overflow-hidden p-0">
              <div className="aspect-square bg-green-50 relative">
                <div className="absolute inset-0 flex items-center justify-center text-green-200">
                  <ImageIcon size={48} />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                  <Link
                    href={`/editor/${template.id}`}
                    className="p-3 bg-white text-[#005C00] rounded-full hover:scale-110 transition-transform"
                  >
                    <Eye size={20} />
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-3 bg-white text-red-500 rounded-full hover:scale-110 transition-transform"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="absolute top-4 right-4 bg-[#27A300] text-white p-1 rounded-full">
                  <Eye size={16} />
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold mb-1 truncate">{template.name}</h3>
                <p className="text-xs text-green-800/60 mb-4 uppercase tracking-widest font-bold">
                  {template.category === 'social-media' ? 'Social Media' : template.category}
                  {template.width && template.height ? ` • ${template.width}x${template.height}` : ''}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {template.tags?.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-[#005C00]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Search, Filter, Grid, List, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const categories = ['Todos', 'Social Media', 'Business', 'Events', 'Documents', 'Ecommerce'];

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="bento-card group overflow-hidden p-0">
            <div className="aspect-square bg-green-50 relative">
               <div className="absolute inset-0 flex items-center justify-center text-green-200">
                  <Grid size={48} />
               </div>
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                  <button className="p-3 bg-white text-[#005C00] rounded-full hover:scale-110 transition-transform">
                    <Eye size={20} />
                  </button>
                  <button className="p-3 bg-white text-red-500 rounded-full hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                  </button>
               </div>
               <div className="absolute top-4 right-4 bg-[#27A300] text-white p-1 rounded-full">
                  <CheckCircle2 size={16} />
               </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold mb-1 truncate">Promoção de Verão {item}</h3>
              <p className="text-xs text-green-800/60 mb-4 uppercase tracking-widest font-bold">Social Media • 1080x1080</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-[#005C00]">Instagram</span>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-[#005C00]">Vendas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

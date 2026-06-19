'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Library, 
  Upload, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  FileJson
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useTranslation, Language } from '@/providers/LanguageContext';

export const Sidebar = () => {
  const pathname = usePathname();
  const { t, language, setLanguage } = useTranslation();

  const menuItems = [
    { icon: LayoutDashboard, label: t('menuDashboard'), href: '/' },
    { icon: Library, label: t('menuLibrary'), href: '/library' },
    { icon: Upload, label: t('menuImport'), href: '/import' },
    { icon: FileJson, label: t('menuEditor'), href: '/editor/new' },
  ];

  return (
    <div className="w-64 bg-[#005C00] text-white h-screen flex flex-col p-4 shadow-xl shrink-0">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-[#27A300] rounded-lg flex items-center justify-center font-bold">E</div>
        <span className="text-xl font-bold tracking-tight">Template Lab</span>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              pathname === item.href 
                ? "bg-[#27A300] text-white shadow-lg scale-105" 
                : "text-green-100 hover:bg-[#27A300]/20"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
        {/* Seletor de Idioma */}
        <div className="flex flex-col gap-2 px-2">
          <span className="text-xs uppercase tracking-wider text-green-200/60 font-bold">Idioma / Language</span>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-[#27A300] text-white text-sm font-bold p-2.5 rounded-xl outline-none border border-white/15 focus:ring-2 focus:ring-white/30 cursor-pointer"
          >
            <option value="pt">Português (PT)</option>
            <option value="en">English (EN)</option>
            <option value="es">Español (ES)</option>
            <option value="fr">Français (FR)</option>
            <option value="de">Deutsch (DE)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 text-sm text-green-200">
          <CheckCircle2 size={16} className="text-[#27A300]" />
          <span>V20 MVP Ready</span>
        </div>
      </div>
    </div>
  );
};

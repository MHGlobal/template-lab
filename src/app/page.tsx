import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  Clock, 
  Plus,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const stats = [
    { label: 'Total Templates', value: '12', icon: ImageIcon, color: 'text-blue-500' },
    { label: 'Aprovados', value: '8', icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Pendentes', value: '3', icon: Clock, color: 'text-yellow-500' },
    { label: 'Com Erro', value: '1', icon: AlertCircle, color: 'text-red-500' },
  ];

  return (
    <div className="p-8 aurora-bg min-h-screen">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-jakarta tracking-tight">Dashboard de Qualidade</h1>
          <p className="text-green-800/60 mt-2 font-medium">Controle de qualidade e validação de templates Editja.</p>
        </div>
        <Link 
          href="/import"
          className="clay-button px-6 py-3 flex items-center gap-2 hover:bg-[#005C00] transition-colors"
        >
          <Plus size={20} />
          <span>Importar Template</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bento-card group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-white shadow-sm ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-[#005C00]">Semana</span>
            </div>
            <h3 className="text-green-800/60 font-semibold text-sm uppercase tracking-wider">{stat.label}</h3>
            <p className="text-4xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bento-card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Templates Recentes</h2>
            <Link href="/library" className="text-[#27A300] text-sm font-bold flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 border border-white/20 hover:bg-white/60 transition-colors cursor-pointer">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-[#27A300] font-bold">
                  T{item}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">Template Promoção Instagram {item}</h4>
                  <p className="text-sm text-green-800/60">Categoria: Social Media • 1080x1080</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                    Aprovado
                  </span>
                  <p className="text-xs text-green-800/40 mt-1">2 horas atrás</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-card flex flex-col justify-center items-center text-center bg-gradient-to-br from-[#27A300] to-[#005C00] text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Meta do MVP</h2>
          <p className="text-green-100/80 mb-6">Estamos a 80% do objetivo de 20 templates aprovados.</p>
          <div className="w-full bg-white/10 rounded-full h-3 mb-6 overflow-hidden">
            <div className="bg-white h-full w-[80%]" />
          </div>
          <button className="w-full py-4 bg-white text-[#005C00] rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform">
            Validar Próximo
          </button>
        </div>
      </div>
    </div>
  );
}

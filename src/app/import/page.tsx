'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileJson, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateTemplate } from '@/lib/validators/templateValidator';
import { getEditorForCategory } from '@/lib/editorRegistry';

export default function ImportPage() {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const router = useRouter();

  const handleImport = () => {
    try {
      let data = JSON.parse(jsonText);
      
      // Smart Wrap: Se for um JSON puro do Fabric.js (tem 'objects'), envolvemos automaticamente
      if (data.objects && !data.fabric_json) {
        console.log('Smart Wrap ativado: Detectado JSON puro do Fabric.js');
        data = {
          id: `template-${Date.now()}`,
          name: "Template Importado (Auto)",
          category: "social-media",
          thumbnail: "",
          width: data.width || 1080,
          height: data.height || 1080,
          tags: ["auto-import"],
          fabric_json: data
        };
      }

      const validation = validateTemplate(data);

      if (validation.valid) {
        localStorage.setItem('pending_template', JSON.stringify(data));
        localStorage.setItem('pending_template_warnings', JSON.stringify(validation.warnings));
        const editorRoute = getEditorForCategory(data.category);
        router.push(`/${editorRoute}/new?fromImport=true&category=${data.category}`);
      } else {
        setError(`Erro de Validação: ${validation.errors.join(', ')}`);
        setWarnings(validation.warnings);
      }
    } catch (e) {
      setError('JSON Inválido. Verifique a sintaxe.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 aurora-bg min-h-screen max-w-5xl mx-auto">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold font-jakarta tracking-tight">Importar Template</h1>
        <p className="text-green-800/60 mt-2 font-medium">Traga o JSON gerado pelo ChatGPT ou de um ficheiro local.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bento-card flex flex-col items-center justify-center border-dashed border-2 border-green-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-[#27A300]">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Upload de Arquivo</h2>
          <p className="text-sm text-green-800/60 mb-6 text-center px-4">Arraste seu ficheiro .json aqui ou clique para selecionar.</p>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileUpload}
            className="hidden" 
            id="file-upload" 
          />
          <label 
            htmlFor="file-upload"
            className="px-6 py-2 bg-[#27A300] text-white rounded-xl font-bold cursor-pointer hover:bg-[#005C00] transition-colors"
          >
            Selecionar Arquivo
          </label>
        </div>

        <div className="bento-card">
          <div className="flex items-center gap-2 mb-4 text-[#005C00]">
            <FileJson size={24} />
            <h2 className="text-xl font-bold">Colar JSON</h2>
          </div>
          <textarea 
            className="w-full h-64 p-4 rounded-xl border border-green-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-[#27A300] outline-none transition-all font-mono text-sm"
            placeholder='{ "id": "...", "fabric_json": { ... } }'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg flex flex-col gap-1 text-sm">
              <span className="font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                Avisos de Qualidade:
              </span>
              <ul className="list-disc pl-5">
                {warnings.map((warn, index) => (
                  <li key={index}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
          <button 
            onClick={handleImport}
            className="w-full mt-6 py-4 bg-[#27A300] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[#005C00] transition-all disabled:opacity-50"
            disabled={!jsonText}
          >
            Carregar Template
          </button>
        </div>
      </div>
    </div>
  );
}

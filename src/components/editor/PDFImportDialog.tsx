'use client';

import React, { useState } from 'react';

export default function PDFImportDialog({
  onImport, onClose,
}: {
  onImport: (file: File) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold mb-3">Importar PDF</h3>
        <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full mb-3 text-sm" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs">Cancelar</button>
          <button onClick={() => file && onImport(file)} disabled={!file} className="px-3 py-1.5 bg-[#27A300] text-white rounded-lg text-xs disabled:opacity-50">Importar</button>
        </div>
      </div>
    </div>
  );
}

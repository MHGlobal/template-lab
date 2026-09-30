'use client';

import React from 'react';

export default function RichTextToolbar({
  onBold, onItalic, onUnderline, onBulletList, onNumberedList,
  isBold, isItalic, isUnderline,
}: {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onBulletList: () => void;
  onNumberedList: () => void;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
}) {
  return (
    <div className="flex gap-0.5 p-1 bg-gray-50 rounded-lg border border-gray-100 mb-2">
      <button onClick={onBold} className={`p-1.5 rounded text-xs font-bold transition-colors ${isBold ? 'bg-[#27A300]/10 text-[#27A300]' : 'hover:bg-gray-200 text-gray-700'}`} title="Bold (Ctrl+B)">B</button>
      <button onClick={onItalic} className={`p-1.5 rounded text-xs italic transition-colors ${isItalic ? 'bg-[#27A300]/10 text-[#27A300]' : 'hover:bg-gray-200 text-gray-700'}`} title="Italic (Ctrl+I)">I</button>
      <button onClick={onUnderline} className={`p-1.5 rounded text-xs underline transition-colors ${isUnderline ? 'bg-[#27A300]/10 text-[#27A300]' : 'hover:bg-gray-200 text-gray-700'}`} title="Underline (Ctrl+U)">U</button>
      <span className="w-px bg-gray-200 mx-0.5" />
      <button onClick={onBulletList} className="p-1.5 rounded hover:bg-gray-200 text-xs text-gray-700" title="Lista">&#8226;</button>
      <button onClick={onNumberedList} className="p-1.5 rounded hover:bg-gray-200 text-xs text-gray-700" title="Lista numerada">1.</button>
    </div>
  );
}

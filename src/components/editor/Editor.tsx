'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEditor } from '@/hooks/useEditor';
import { templateService } from '@/services/templateService';
import { useTranslation } from '@/providers/LanguageContext';
import {
  Undo2, Redo2, MoveUp, MoveDown, Trash2,
  Download, Save, Loader2,
} from 'lucide-react';
import Toolbar from './Toolbar';
import PropertyPanel from './PropertyPanel';
import ZoomControls from './ZoomControls';
import LayerPanel from './LayerPanel';

interface EditorProps {
  projectId?: string;
  initialJson?: any;
  width?: number;
  height?: number;
  name?: string;
}

export default function Editor({
  projectId,
  initialJson,
  width = 800,
  height = 600,
  name = 'Sem título',
}: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editorName, setEditorName] = useState(name);

  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'layers'>('properties');

  const {
    isReady,
    activeTool, setActiveTool,
    toggleFreeDrawing, addText, addImage,
    toggleGrid, isGridVisible,
    togglePan, isPanMode,
    zoomIn, zoomOut, zoomTo, zoomFit, zoomLevel,
    setFill, setStroke, setStrokeWidth, setOpacity,
    setPosition, setSize,
    setFontFamily, setFontSize, setFontWeight, setTextAlign, setTextContent,
    applyImageFilter,
    bringToFront, sendToBack, deleteSelected,
    groupSelection, ungroupSelection,
    alignSelected, distributeSelected,
    undo, redo, loadJson,
    exportToImage, exportToJson,
    activeProps, selectedObject, isDrawingMode,
    getCanvasObjects, selectObject,
    setLayerVisibility, setLayerLock, reorderLayer,
  } = useEditor(canvasRef, { width, height, maxHistory: 200 });

  const canvasObjects = getCanvasObjects();

  const handleToggleVisibility = useCallback((obj: any) => {
    const wasVisible = obj.visible !== false && obj.opacity !== 0;
    setLayerVisibility(obj, !wasVisible);
  }, [setLayerVisibility]);

  const handleToggleLock = useCallback((obj: any) => {
    const wasLocked = obj.lockMovementX === true;
    setLayerLock(obj, !wasLocked);
  }, [setLayerLock]);

  useEffect(() => {
    if (initialJson && isReady) {
      loadJson(initialJson);
    }
  }, [initialJson, isReady, loadJson]);

  const handleExport = () => {
    const dataUrl = exportToImage('png');
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${editorName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const json = exportToJson();
      const dataUrl = exportToImage('png');
      await templateService.saveProject({
        id: projectId || `project-${Date.now()}`,
        name: editorName,
        thumbnail_url: dataUrl || '',
        status: 'editing',
        fabric_json: json,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Toolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onAddText={addText}
        onAddImage={addImage}
        onToggleFreeDrawing={toggleFreeDrawing}
        onToggleGrid={toggleGrid}
        isGridVisible={isGridVisible}
        isDrawingMode={isDrawingMode}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-12 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={undo} title={t('editorUndo')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Undo2 className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={redo} title={t('editorRedo')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Redo2 className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1.5" />
            <button onClick={bringToFront} title={t('editorFront')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <MoveUp className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={sendToBack} title={t('editorBack')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <MoveDown className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={deleteSelected} title={t('editorDelete')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-red-500 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 max-w-xs mx-4">
            <input
              type="text"
              className="w-full text-center font-bold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#27A300] focus:outline-none transition-all py-0.5 text-sm"
              value={editorName}
              onChange={e => setEditorName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 min-w-[80px] justify-center"
            >
              {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />}
              {saveStatus === 'saving' ? 'A guardar...' : saveStatus === 'saved' ? 'Guardado' : saveStatus === 'error' ? 'Erro' : t('editorSave')}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27A300] hover:bg-[#005C00] text-white rounded-lg text-xs font-medium transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              {t('editorExport')}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#E8ECF0]" style={{
          backgroundImage: 'radial-gradient(circle, #D0D5DD 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}>
          <div className="bg-white shadow-2xl rounded-sm">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomTo={zoomTo}
          onZoomFit={zoomFit}
          onTogglePan={togglePan}
          isPanMode={isPanMode}
          canvasWidth={width}
          canvasHeight={height}
        />
      </main>

      <aside className="w-72 bg-white border-l shadow-sm flex flex-col shrink-0">
        <div className="flex border-b shrink-0">
          <button
            onClick={() => setRightPanelTab('properties')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              rightPanelTab === 'properties'
                ? 'text-[#27A300] border-b-2 border-[#27A300]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t('editorObjectProperties')}
          </button>
          <button
            onClick={() => setRightPanelTab('layers')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              rightPanelTab === 'layers'
                ? 'text-[#27A300] border-b-2 border-[#27A300]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t('editorLayers')}
          </button>
        </div>

        {rightPanelTab === 'properties' ? (
          <PropertyPanel
            activeProps={activeProps}
            onSetFill={setFill}
            onSetStroke={setStroke}
            onSetStrokeWidth={setStrokeWidth}
            onSetOpacity={setOpacity}
            onSetPosition={setPosition}
            onSetSize={setSize}
            onSetFontFamily={setFontFamily}
            onSetFontSize={setFontSize}
            onSetFontWeight={setFontWeight}
            onSetTextAlign={setTextAlign}
            onSetTextContent={setTextContent}
            onApplyImageFilter={applyImageFilter}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onDelete={deleteSelected}
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
          />
        ) : (
          <LayerPanel
            objects={canvasObjects}
            activeObject={selectedObject}
            onSelectObject={selectObject}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onReorder={reorderLayer}
          />
        )}
      </aside>
    </div>
  );
}

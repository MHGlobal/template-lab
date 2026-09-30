'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditor, type ActiveObjectProps } from '@/hooks/useEditor';
import { usePages } from '@/hooks/usePages';
import { useVariables } from '@/hooks/useVariables';
import { useQRCode } from '@/hooks/useQRCode';
import { useVersioning } from '@/hooks/useVersioning';
import { useComments } from '@/hooks/useComments';
import { templateService } from '@/services/templateService';
import { useTranslation } from '@/providers/LanguageContext';
import { SelectionProvider, useSelectionStore } from '@/stores/selectionStore';
import {
  Undo2, Redo2, MoveUp, MoveDown, Trash2,
  Download, Save, Loader2, Eye, History, MessageCircle,
  Printer, Scissors, Map, Pencil, FileText, Tag, Play, Columns,
} from 'lucide-react';
import Toolbar from './Toolbar';
import PropertyPanel from './PropertyPanel';
import ZoomControls from './ZoomControls';
import LayerPanel from './LayerPanel';
import ArtboardSelector from './ArtboardSelector';
import SafeZoneOverlay from './SafeZoneOverlay';
import Rulers from './Rulers';
import PageBar from './PageBar';
import Timeline from './Timeline';
import VariablesPanel from './VariablesPanel';
import RichTextToolbar from './RichTextToolbar';
import CommandPalette from './CommandPalette';
import ShortcutsModal from './ShortcutsModal';
import StatusBar from './StatusBar';
import SaveAsDialog from './SaveAsDialog';
import SplitPane from './SplitPane';
import VersionPanel from './VersionPanel';
import CommentTool from './CommentTool';
import PrintPreview from './PrintPreview';
import CropTool from './CropTool';
import MiniMap from './MiniMap';
import PathEditor from './PathEditor';
import PDFImportDialog from './PDFImportDialog';

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
  name = 'Sem tÃ­tulo',
}: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editorName, setEditorName] = useState(name);

  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'layers' | 'variables'>('properties');
  const [canvasBg, setCanvasBgState] = useState('#ffffff');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showVersioning, setShowVersioning] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showPDFImport, setShowPDFImport] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [cropTarget, setCropTarget] = useState<fabric.FabricObject | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const {
    isReady,
    activeTool, setActiveTool,
    toggleFreeDrawing, addText, addImage,
    toggleGrid, isGridVisible,
    togglePan, isPanMode,
    zoomIn, zoomOut, zoomTo, zoomFit, zoomToSelection, zoomLevel,
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
    setBrushColor, setBrushWidth,
    setLayerVisibility, setLayerLock, reorderLayer,
    resizeCanvas, setCanvasBg, uploadCanvasBg, toggleAspectLock, setArrowStyle,
    getFabricCanvas, hoveredObject,
    toggleBold, toggleItalic, toggleUnderline, toggleBulletList, toggleNumberedList,
    applyGradient, removeGradient,
    applyShadow, removeShadow,
    applyMask, removeMask,
    isPenDrawing, startPath, addPoint, finishPath,
    createTable,
    animations, isPlaying, speed, setSpeed, setKeyframes, removeKeyframes, play, stopAnimation,
    useAsPattern,
  } = useEditor(canvasRef, { width, height, maxHistory: 200 });

  // Viewport / Workspace zoom-aware scroll
  const pasteboard = 200;
  const workspaceW = (canvasSize.width + pasteboard * 2) * zoomLevel;
  const workspaceH = (canvasSize.height + pasteboard * 2) * zoomLevel;

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (zoomLevel > 1) {
      vp.style.overflow = 'auto';
    } else {
      vp.style.overflow = 'hidden';
      const el = vp.firstElementChild as HTMLElement | null;
      if (el) {
        vp.scrollLeft = (el.offsetWidth - vp.clientWidth) / 2;
        vp.scrollTop = (el.offsetHeight - vp.clientHeight) / 2;
      }
    }
  }, [zoomLevel]);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      addImage(url);
    });
  }, [addImage]);

  const handleResizeCanvas = useCallback((w: number, h: number) => {
    resizeCanvas(w, h);
    setCanvasSize({ width: w, height: h });
  }, [resizeCanvas]);


  const { pages, activePageId, addPage, removePage, duplicatePage, renamePage, switchPage, saveCurrentPage } = usePages(width, height);

  const [pageTransition, setPageTransition] = useState<'none' | 'slide-left' | 'slide-right' | 'fade' | 'zoom'>('none');

  const handleSwitchPage = useCallback((id: string) => {
    if (pageTransition !== 'none') return;
    const transition = 'fade';
    setPageTransition(transition);
    const json = exportToJson();
    saveCurrentPage(json);
    setTimeout(() => {
      const canvas = getFabricCanvas();
      if (canvas) {
        canvas.getObjects().forEach(o => {
          if ((o as any).data?.type !== 'grid' && !(o as any).data?.temp) canvas.remove(o);
        });
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      switchPage(id);
      const targetPage = pages.find(p => p.id === id);
      if (targetPage?.fabricJson) {
        loadJson(targetPage.fabricJson);
      }
      setPageTransition('none');
    }, 250);
  }, [exportToJson, saveCurrentPage, switchPage, pageTransition, getFabricCanvas, pages, loadJson]);


    const getCanvas = useCallback(() => getFabricCanvas(), [getFabricCanvas]);
  const { generateQRCode } = useQRCode();
  const { snapshots, takeSnapshot, restoreSnapshot, deleteSnapshot, renameSnapshot } = useVersioning();
  const { comments, addComment, resolveComment, deleteComment, getCommentsForObject } = useComments();
  const {
    variables, scanVariables, updateVariable, previewVariables, applyVariables, restoreVariables,
  } = useVariables(getCanvas);

  const handleGenerateQR = useCallback(async () => {
    const text = window.prompt('Texto para QR Code:');
    if (!text) return;
    const canvas = (window as any).__fabricCanvas;
    if (canvas) await generateQRCode(text, canvas);
  }, [generateQRCode]);

  const handleCreateTable = useCallback(() => {
    const canvas = (window as any).__fabricCanvas;
    if (canvas) createTable(canvas, 3, 3);
  }, [createTable]);
  const canvasObjects = getCanvasObjects();

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  const handleToggleVisibility = useCallback((obj: any) => {
    const wasVisible = obj.visible !== false && obj.opacity !== 0;
    setLayerVisibility(obj, !wasVisible);
  }, [setLayerVisibility]);

  const handleToggleLock = useCallback((obj: any) => {
    const wasLocked = obj.lockMovementX === true;
    setLayerLock(obj, !wasLocked);
  }, [setLayerLock]);

  const handleSetCanvasBg = useCallback((color: string) => {
    setCanvasBgState(color);
    setCanvasBg(color);
  }, [setCanvasBg, setCanvasBgState]);

  const handleUploadBgImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadCanvasBg(file);
        setCanvasBgState('');
      }
    };
    input.click();
  }, [uploadCanvasBg]);

  const handleToggleAspectLock = useCallback(() => {
    const obj = selectedObject;
    if (obj) toggleAspectLock(obj);
  }, [selectedObject, toggleAspectLock]);

  useEffect(() => {
    if (initialJson && isReady) {
      loadJson(initialJson);
    }
  }, [initialJson, isReady, loadJson]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFocusedMode(p => !p);
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(p => !p);
      }
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowCommandPalette(p => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { if (isReady) scanVariables(); }, [isReady, scanVariables]);

  const handleCropConfirm = useCallback((left: number, top: number, width: number, height: number) => {
    const canvas = getFabricCanvas();
    if (!canvas || !cropTarget) return;
    cropTarget.set({ left, top, width, height, scaleX: 1, scaleY: 1 });
    canvas.renderAll();
    setShowCropTool(false);
    setCropTarget(null);
  }, [getFabricCanvas, cropTarget]);

  const handleCropCancel = useCallback(() => {
    setShowCropTool(false);
    setCropTarget(null);
  }, []);

  const handlePDFImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const textbox = new fabric.IText(text || '[PDF contents would be parsed here]', {
        left: 100, top: 100, fontSize: 14, fill: '#000',
      });
      const canvas = getFabricCanvas();
      if (canvas) { canvas.add(textbox); canvas.setActiveObject(textbox); canvas.renderAll(); }
    };
    reader.readAsText(file.slice(0, 1024));
    setShowPDFImport(false);
  }, [getFabricCanvas]);

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

  const handleSaveAs = useCallback((name: string, format: 'png' | 'jpg' | 'json' | 'svg') => {
    if (format === 'json') {
      const json = exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${name}.json`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'svg') {
      const canvas = getFabricCanvas();
      if (canvas) {
        const svg = canvas.toSVG({}, (s: string) => s);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${name}.svg`; a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      const fmt = format === 'jpg' ? 'jpeg' : 'png';
      const dataUrl = exportToImage(fmt);
      if (dataUrl) {
        const a = document.createElement('a'); a.href = dataUrl; a.download = `${name}.${format}`; a.click();
      }
    }
  }, [exportToJson, exportToImage, getFabricCanvas]);

  return (
    <SelectionProvider>
    <EditorSync activeProps={activeProps} />
    <div className={`flex h-screen bg-gray-100 overflow-hidden font-sans ${isFocusedMode ? 'fixed inset-0 z-50' : ''}`}>
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

      <SplitPane
        left={
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

          <div className="flex items-center gap-2 ml-2">
            <ArtboardSelector
              currentWidth={canvasSize.width}
              currentHeight={canvasSize.height}
              onResize={handleResizeCanvas}
            />
            <button
              onClick={() => setShowSafeZone(!showSafeZone)}
              title={showSafeZone ? 'Ocultar zona segura' : 'Mostrar zona segura'}
              className={`p-1.5 rounded-lg transition-colors ${
                showSafeZone ? 'bg-green-100 text-[#27A300]' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
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
              onClick={() => setShowSaveAs(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Save as
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27A300] hover:bg-[#005C00] text-white rounded-lg text-xs font-medium transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              {t('editorExport')}
            </button>
            <button
              onClick={() => setShowVersioning(p => !p)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${showVersioning ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Versões"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowComments(p => !p)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${showComments ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Comentários"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              title="Pré-visualização de impressão"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPDFImport(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              title="Importar PDF"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMiniMap(p => !p)}
              className={`p-1.5 rounded-lg transition-colors ${showMiniMap ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Mini-mapa"
            >
              <Map className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowVariables(p => !p); if (!showVariables) scanVariables(); }}
              className={`p-1.5 rounded-lg transition-colors ${showVariables ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Variáveis"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { const obj = selectedObject; if (obj) { setCropTarget(obj); setShowCropTool(true); } }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 disabled:opacity-30"
              title="Cortar"
              disabled={!selectedObject}
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <PageBar
          pages={pages}
          activePageId={activePageId}
          onSwitch={handleSwitchPage}
          onAdd={addPage}
          onRemove={removePage}
          onDuplicate={duplicatePage}
          onRename={renamePage}
        />

        {selectedObject && (selectedObject as any).type?.includes('text') && (
          <div className="px-4 pt-2 pb-0">
            <RichTextToolbar
              onBold={toggleBold}
              onItalic={toggleItalic}
              onUnderline={toggleUnderline}
              onBulletList={toggleBulletList}
              onNumberedList={toggleNumberedList}
              isBold={(selectedObject as any).fontWeight === 'bold'}
              isItalic={(selectedObject as any).fontStyle === 'italic'}
              isUnderline={(selectedObject as any).underline === true}
            />
          </div>
        )}

          <div
            ref={viewportRef}
            className={`flex-1 flex items-start justify-center ${isDragOver ? 'bg-blue-50' : 'bg-[#E8ECF0]'}`}
            style={{
              backgroundImage: 'radial-gradient(circle, #D0D5DD 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              overflow: zoomLevel > 1 ? 'auto' : 'hidden',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className="relative shrink-0"
              style={{ width: workspaceW, height: workspaceH,
                paddingTop: pasteboard * zoomLevel,
                paddingLeft: pasteboard * zoomLevel,
              }}
            >
            <div
              className={`relative bg-white shadow-2xl rounded-sm transition-all duration-200 origin-top-left ${
                pageTransition === 'fade' ? 'opacity-0 scale-95' :
                pageTransition === 'slide-left' ? '-translate-x-8 opacity-0' :
                pageTransition === 'slide-right' ? 'translate-x-8 opacity-0' :
                pageTransition === 'zoom' ? 'opacity-0 scale-75' : ''
              }`}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            >
              <Rulers width={canvasSize.width} height={canvasSize.height} zoom={zoomLevel} mousePos={mousePos} />
              <canvas ref={canvasRef} />
              <SafeZoneOverlay width={canvasSize.width} height={canvasSize.height} zoom={zoomLevel} visible={showSafeZone} />
              {isDragOver && (
                <div className="absolute inset-0 border-2 border-dashed border-[#27A300] bg-[#27A300]/5 rounded-sm flex items-center justify-center pointer-events-none">
                  <p className="text-sm font-bold text-[#27A300] bg-white/80 px-4 py-2 rounded-xl">Largar imagem para adicionar</p>
                </div>
              )}
            </div>
            </div>
          </div>

          <Timeline
            isPlaying={isPlaying}
            isPaused={false}
            speed={speed}
            keyframes={animations}
            onPlay={() => play(1000, (p) => { /* tick handled by hook */ })}
            onPause={() => stopAnimation()}
            onStop={() => stopAnimation()}
            onSetSpeed={setSpeed}
          />

        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomTo={zoomTo}
          onZoomFit={zoomFit}
          onZoomToSelection={zoomToSelection}
          onTogglePan={togglePan}
          isPanMode={isPanMode}
          canvasWidth={width}
          canvasHeight={height}
        />
          </main>
        }
        right={
          <div className="flex flex-col h-full">
            <StatusBar
              mousePos={mousePos}
              zoom={zoomLevel}
              objectCount={canvasObjects.length}
              isGridVisible={isGridVisible}
            />
            <aside className="flex-1 bg-white border-l shadow-sm flex flex-col overflow-hidden">
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
          <button
            onClick={() => { setRightPanelTab('variables'); scanVariables(); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              rightPanelTab === 'variables'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Variáveis
          </button>
        </div>

        {rightPanelTab === 'properties' ? (
          <PropertyPanel
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
            onToggleAspectLock={handleToggleAspectLock}
            canvasBg={canvasBg}
            onSetCanvasBg={handleSetCanvasBg}
            onUploadBgImage={handleUploadBgImage}
            onArrowStyleChange={setArrowStyle}
            onToggleBold={toggleBold}
            onToggleItalic={toggleItalic}
            onToggleUnderline={toggleUnderline}
            onToggleBulletList={toggleBulletList}
            onToggleNumberedList={toggleNumberedList}
            onApplyGradient={(def) => selectedObject && applyGradient(selectedObject as any, def)}
            onRemoveGradient={() => selectedObject && removeGradient(selectedObject as any)}
            onApplyShadow={(config) => selectedObject && applyShadow(selectedObject as any, config)}
            onRemoveShadow={() => selectedObject && removeShadow(selectedObject as any)}
            onApplyMask={(shape) => selectedObject && applyMask(selectedObject as any, shape)}
            onRemoveMask={() => selectedObject && removeMask(selectedObject as any)}
            onUseAsPattern={() => selectedObject && useAsPattern(selectedObject as any)}
          />
        ) : rightPanelTab === 'layers' ? (
          <LayerPanel
            objects={canvasObjects}
            activeObject={selectedObject}
            hoveredObject={hoveredObject}
            onSelectObject={selectObject}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onReorder={reorderLayer}
          />
        ) : (
          <VariablesPanel
            variables={variables}
            onUpdate={updateVariable}
            onApply={applyVariables}
            onRestore={restoreVariables}
          />
        )}
      </aside>
          </div>
        }
      />

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          actions={[
            { id: 'undo', label: 'Undo', shortcut: '⌘Z', action: () => undo() },
            { id: 'redo', label: 'Redo', shortcut: '⌘⇧Z', action: () => redo() },
            { id: 'delete', label: 'Eliminar selecionado', shortcut: 'Del', action: () => deleteSelected() },
            { id: 'grid', label: 'Toggle Grid', shortcut: 'G', action: () => toggleGrid() },
            { id: 'zoom-in', label: 'Zoom In', shortcut: '⌘+', action: () => zoomIn() },
            { id: 'zoom-out', label: 'Zoom Out', shortcut: '⌘-', action: () => zoomOut() },
            { id: 'zoom-fit', label: 'Zoom to Fit', shortcut: '⌘0', action: () => zoomFit() },
          ]}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showSaveAs && (
        <SaveAsDialog
          onClose={() => setShowSaveAs(false)}
          onSave={handleSaveAs}
          defaultName={editorName}
        />
      )}
      {showVersioning && (
        <div className="absolute top-12 right-72 z-40 w-72 bg-white border rounded-2xl shadow-2xl max-h-80">
          <VersionPanel
            snapshots={snapshots}
            onTakeSnapshot={(name) => takeSnapshot(name, exportToJson())}
            onRestore={(id) => { const json = restoreSnapshot(id); if (json) loadJson(json); }}
            onDelete={deleteSnapshot}
            onRename={renameSnapshot}
          />
        </div>
      )}
      {showComments && (
        <CommentTool
          comments={selectedObject ? getCommentsForObject((selectedObject as any).data?.id || '') : []}
          onAdd={(text) => { if (selectedObject) addComment((selectedObject as any).data?.id || '', text); }}
          onResolve={resolveComment}
          onDelete={deleteComment}
          onClose={() => setShowComments(false)}
        />
      )}
      {showMiniMap && (
        <div className="absolute bottom-4 right-4 z-40 bg-white border rounded-xl shadow-2xl overflow-hidden" style={{ width: 140, height: 110 }}>
          <MiniMap
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            getCanvasSnapshot={() => exportToImage('png')}
            onNavigate={(x, y) => { /* pan-to handler */ }}
          />
        </div>
      )}
      {showPrintPreview && (
        <PrintPreview
          canvasJson={exportToJson()}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
      {showCropTool && (
        <CropTool
          canvas={getFabricCanvas()}
          target={cropTarget}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      {selectedObject && (selectedObject as any).type === 'path' && (
        <PathEditor
          path={selectedObject as any}
          canvas={getFabricCanvas()}
          onFinish={() => {}}
        />
      )}
      {showPDFImport && (
        <PDFImportDialog
          onImport={handlePDFImport}
          onClose={() => setShowPDFImport(false)}
        />
      )}
    </div>
    </SelectionProvider>
  );
}

function EditorSync({ activeProps }: { activeProps: ActiveObjectProps | null }) {
  const { setActiveProps, setSelectedIds } = useSelectionStore();
  useEffect(() => {
    setActiveProps(activeProps);
    setSelectedIds(activeProps?.id ? [activeProps.id] : []);
  }, [activeProps, setActiveProps, setSelectedIds]);
  return null;
}







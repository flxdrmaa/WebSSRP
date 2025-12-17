import React, { Component, ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Download, ZoomIn, ZoomOut, Upload, Layers, 
  GripVertical, Type, Image as ImageIcon, ArrowUp, ArrowDown, Trash2,
  Copy, Move, Eye, EyeOff, Lock, Unlock 
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

export interface Position {
  x: number;
  y: number;
}

export enum LayerType {
  IMAGE = 'image',
  TEXT = 'text',
}

export interface BaseLayer {
  id: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  name: string;
}

export interface ImageLayer extends BaseLayer {
  type: LayerType.IMAGE;
  src: string; // Data URL
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number; // degrees
  filters: {
    brightness: number; // 100 base
    contrast: number; // 100 base
    saturation: number; // 100 base
    blur: number; // 0 base
  };
}

export interface TextLayer extends BaseLayer {
  type: LayerType.TEXT;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadowBlur: number;
  lineHeight: number;
  isBold: boolean;
  isItalic: boolean;
}

export type Layer = ImageLayer | TextLayer;

export enum PresetColor {
  WHITE = '#FFFFFF',
  ME = '#C2A2DA', // Purple for /me
  DO = '#9A9AC1', // Slight variation or same as ME
  PM = '#E6E600', // Yellow
  RADIO = '#269BD2', // Blue-ish
  ERROR = '#FF0000',
  SERVER = '#AAC5E3',
  GREEN = '#33AA33',
}

export const PRESET_COLORS = [
  { name: 'Talk (White)', value: PresetColor.WHITE },
  { name: '/me (Purple)', value: PresetColor.ME },
  { name: '/do (Soft Purple)', value: PresetColor.DO },
  { name: 'PM (Yellow)', value: PresetColor.PM },
  { name: 'Radio (Blue)', value: PresetColor.RADIO },
  { name: 'Success (Green)', value: PresetColor.GREEN },
  { name: 'Server (Cyan)', value: PresetColor.SERVER },
];

// ==========================================
// UTILS
// ==========================================

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const detectChatColor = (text: string): string => {
  const lower = text.toLowerCase();
  if (text.startsWith('*')) return '#C2A2DA'; // /me action
  if (lower.includes('says:')) return '#FFFFFF'; // Normal talk
  if (lower.includes('shouts:')) return '#FFFFFF'; 
  if (lower.includes('whispers:')) return '#FFFFFF';
  if (lower.startsWith('((') || lower.endsWith('))')) return '#A9C4E4'; // OOC
  return '#FFFFFF';
};

const parseChatlog = (rawText: string, startY: number = 50): any[] => {
  const lines = rawText.split('\n').filter(l => l.trim() !== '');
  const layers: any[] = [];
  let currentY = startY;

  lines.forEach((line) => {
    // Remove timestamps if present e.g., [12:00:00]
    const cleanText = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
    
    layers.push({
      content: cleanText,
      color: detectChatColor(cleanText),
      y: currentY
    });
    currentY += 24; // Default spacing
  });

  return layers;
};

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};

// ==========================================
// COMPONENTS
// ==========================================

// --- Toolbar ---
interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
  onExport: () => void;
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onZoomIn, onZoomOut, zoom, onExport, onAddImage }) => {
  return (
    <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-indigo-500 font-bold text-lg tracking-tight">
           <Layers className="w-6 h-6 mr-2" />
           SSRP Master
        </div>
        <div className="h-6 w-px bg-zinc-700 mx-2"></div>
        
        <label className="flex items-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded cursor-pointer transition-colors">
          <Upload className="w-4 h-4 mr-2" />
          Upload Base
          <input type="file" accept="image/*" onChange={onAddImage} className="hidden" />
        </label>
      </div>

      <div className="flex items-center space-x-2 bg-zinc-800 rounded-md p-1">
        <button onClick={onZoomOut} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={onExport}
          className="flex items-center px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded shadow transition-all hover:shadow-indigo-500/20"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PNG
        </button>
      </div>
    </div>
  );
};

// --- Layer Manager ---
interface LayerManagerProps {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddText: (text: string, color?: string, yOffset?: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (id: string) => void;
  onBulkAddText: (layers: any[]) => void;
}

const LayerManager: React.FC<LayerManagerProps> = ({ 
    layers, selectedId, onSelect, onAddText, onReorder, onDelete, onBulkAddText
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'chatlog'>('chatlog');
  const [chatInput, setChatInput] = useState('');

  const handleChatParse = () => {
    if(!chatInput.trim()) return;
    const parsed = parseChatlog(chatInput);
    onBulkAddText(parsed);
    setChatInput('');
    setActiveTab('layers');
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < layers.length) {
      onReorder(index, newIndex);
    }
  };

  return (
    <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          Layers ({layers.length})
        </button>
        <button
          onClick={() => setActiveTab('chatlog')}
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chatlog' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          Add Chatlog
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'layers' ? (
          <div className="p-2 space-y-1">
            {layers.length === 0 && (
                <div className="text-center text-zinc-600 py-8 text-sm">No layers yet.</div>
            )}
            {/* Render in reverse order for list (Top layer at top of list) */}
            {[...layers].reverse().map((layer, reverseIndex) => {
              const realIndex = layers.length - 1 - reverseIndex;
              return (
                <div
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`group flex items-center p-2 rounded cursor-pointer border ${
                    selectedId === layer.id 
                      ? 'bg-zinc-800 border-indigo-500/50' 
                      : 'border-transparent hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="mr-2 text-zinc-600 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="mr-2 text-zinc-400">
                    {layer.type === LayerType.TEXT ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate font-medium">
                        {layer.name || (layer.type === LayerType.TEXT ? (layer as any).content : 'Image')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); moveLayer(realIndex, 1); }} className="p-1 hover:text-white text-zinc-500" disabled={realIndex === layers.length - 1}>
                        <ArrowUp className="w-3 h-3" />
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); moveLayer(realIndex, -1); }} className="p-1 hover:text-white text-zinc-500" disabled={realIndex === 0}>
                        <ArrowDown className="w-3 h-3" />
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 flex flex-col h-full">
            <p className="text-xs text-zinc-400 mb-2">Paste your GTA chatlog here. The app will automatically detect /me (purple) and talk (white).</p>
            <textarea
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none mb-4"
              placeholder={`* Mask_1234 reaches for his waistband.
Stranger 9901 says: Hey, watch it!
(( Use standard format for auto-colors ))`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              onClick={handleChatParse}
              disabled={!chatInput.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded shadow"
            >
              Process & Add to Canvas
            </button>
            <div className="mt-4 border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 font-bold mb-2">QUICK ADD SINGLE LINE</p>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onAddText('Sample Text', '#FFFFFF')} className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700">
                        + White Text
                    </button>
                    <button onClick={() => onAddText('* Action Text', '#C2A2DA')} className="py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 text-xs rounded border border-purple-900/50">
                        + /me Action
                    </button>
                     <button onClick={() => onAddText('(( OOC Text ))', '#A9C4E4')} className="py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-900/50">
                        + (( OOC ))
                    </button>
                    <button onClick={() => onAddText('Radio: text', '#269BD2')} className="py-2 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 text-xs rounded border border-cyan-900/50">
                        + Radio
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Properties Panel ---
interface PropertiesPanelProps {
  layer: Layer | null;
  onChange: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ layer, onChange, onDelete, onDuplicate }) => {
  if (!layer) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col items-center justify-center text-zinc-500 shrink-0">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Move className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-center font-medium">Select a layer to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-200 flex items-center">
            {layer.type === LayerType.TEXT ? <Type className="w-4 h-4 mr-2 text-blue-400"/> : <ImageIcon className="w-4 h-4 mr-2 text-green-400"/>}
            Properties
        </h3>
        <div className="flex space-x-1">
             <button onClick={() => onChange({ visible: !layer.visible })} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                {layer.visible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
            </button>
            <button onClick={() => onChange({ locked: !layer.locked })} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                {layer.locked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
            </button>
            <button onClick={onDuplicate} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                <Copy className="w-4 h-4"/>
            </button>
            <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded">
                <Trash2 className="w-4 h-4"/>
            </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* TEXT PROPERTIES */}
        {layer.type === LayerType.TEXT && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase">Content</label>
              <textarea
                value={(layer as TextLayer).content}
                onChange={(e) => onChange({ content: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase">Typography</label>
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <span className="text-xs text-zinc-500 mb-1 block">Size (px)</span>
                    <input
                        type="number"
                        value={(layer as TextLayer).fontSize}
                        onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                    />
                 </div>
                 <div>
                    <span className="text-xs text-zinc-500 mb-1 block">Line Height</span>
                    <input
                        type="number"
                        step="0.1"
                        value={(layer as TextLayer).lineHeight}
                        onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                    />
                 </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                  <button 
                    onClick={() => onChange({ isBold: !(layer as TextLayer).isBold })}
                    className={`flex-1 py-1 text-sm rounded border ${ (layer as TextLayer).isBold ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400' }`}
                  >
                      Bold
                  </button>
                  <button 
                    onClick={() => onChange({ isItalic: !(layer as TextLayer).isItalic })}
                    className={`flex-1 py-1 text-sm rounded border ${ (layer as TextLayer).isItalic ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400' }`}
                  >
                      Italic
                  </button>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase">Colors</label>
                
                {/* Preset Colors */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c.name}
                            onClick={() => onChange({ color: c.value })}
                            title={c.name}
                            className="w-6 h-6 rounded-full border border-zinc-600 focus:ring-2 ring-indigo-500"
                            style={{ backgroundColor: c.value }}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-xs text-zinc-500 mb-1 block">Text Color</span>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="color" 
                                value={(layer as TextLayer).color}
                                onChange={(e) => onChange({ color: e.target.value })}
                                className="h-8 w-8 rounded bg-transparent cursor-pointer"
                            />
                            <span className="text-xs text-zinc-400 font-mono">{(layer as TextLayer).color}</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-zinc-500 mb-1 block">Stroke Color</span>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="color" 
                                value={(layer as TextLayer).strokeColor}
                                onChange={(e) => onChange({ strokeColor: e.target.value })}
                                className="h-8 w-8 rounded bg-transparent cursor-pointer"
                            />
                             <span className="text-xs text-zinc-400 font-mono">{(layer as TextLayer).strokeColor}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Stroke Width</span>
                        <span>{(layer as TextLayer).strokeWidth}px</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={(layer as TextLayer).strokeWidth}
                        onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
          </>
        )}

        {/* IMAGE PROPERTIES */}
        {layer.type === LayerType.IMAGE && (
          <>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase">Transform</label>
                <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Scale</span>
                        <span>{Math.round((layer as ImageLayer).scale * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={(layer as ImageLayer).scale}
                        onChange={(e) => onChange({ scale: Number(e.target.value) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                 <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Rotation</span>
                        <span>{(layer as ImageLayer).rotation}°</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={(layer as ImageLayer).rotation}
                        onChange={(e) => onChange({ rotation: Number(e.target.value) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
                <label className="text-xs font-medium text-zinc-400 uppercase">Filters</label>
                
                {[
                    { key: 'brightness', label: 'Brightness', min: 0, max: 200, def: 100 },
                    { key: 'contrast', label: 'Contrast', min: 0, max: 200, def: 100 },
                    { key: 'saturation', label: 'Saturation', min: 0, max: 200, def: 100 },
                    { key: 'blur', label: 'Blur', min: 0, max: 20, def: 0 },
                ].map((filter) => (
                    <div key={filter.key}>
                         <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>{filter.label}</span>
                            <span>{(layer as ImageLayer).filters[filter.key as keyof typeof layer.filters]}</span>
                        </div>
                        <input
                            type="range"
                            min={filter.min}
                            max={filter.max}
                            value={(layer as ImageLayer).filters[filter.key as keyof typeof layer.filters]}
                            onChange={(e) => {
                                const newFilters = { ...(layer as ImageLayer).filters, [filter.key]: Number(e.target.value) };
                                onChange({ filters: newFilters });
                            }}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                ))}
            </div>
          </>
        )}

        <div className="pt-4 border-t border-zinc-800 space-y-2">
             <label className="text-xs font-medium text-zinc-400 uppercase">Coordinates</label>
             <div className="grid grid-cols-2 gap-2">
                 <div className="bg-zinc-800 rounded px-2 py-1 flex items-center justify-between text-xs">
                     <span className="text-zinc-500">X</span>
                     <input 
                        type="number" 
                        value={Math.round(layer.x)} 
                        onChange={(e) => onChange({ x: Number(e.target.value) })}
                        className="w-16 bg-transparent text-right outline-none"
                     />
                 </div>
                 <div className="bg-zinc-800 rounded px-2 py-1 flex items-center justify-between text-xs">
                     <span className="text-zinc-500">Y</span>
                     <input 
                        type="number" 
                        value={Math.round(layer.y)} 
                        onChange={(e) => onChange({ y: Number(e.target.value) })}
                        className="w-16 bg-transparent text-right outline-none"
                     />
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

// --- Canvas Renderer ---
interface CanvasRendererProps {
  width: number;
  height: number;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayerPos: (id: string, x: number, y: number) => void;
  zoom: number;
  bgImage: HTMLImageElement | null;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayerPos,
  zoom,
  bgImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialLayerPos, setInitialLayerPos] = useState({ x: 0, y: 0 });

  // Load images for layers
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    layers.forEach(layer => {
      if (layer.type === LayerType.IMAGE && !loadedImages[layer.id]) {
        const img = new Image();
        img.src = layer.src;
        img.onload = () => {
          setLoadedImages(prev => ({ ...prev, [layer.id]: img }));
        };
      }
    });
  }, [layers, loadedImages]);

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply Zoom
    ctx.scale(zoom, zoom);

    // Draw Background (Standard SAMP Black Screen / Blindfold base if no bg, or just black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Helper to draw text
    const drawText = (layer: TextLayer) => {
      ctx.font = `${layer.isItalic ? 'italic' : 'normal'} ${layer.isBold ? 'bold' : 'normal'} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = layer.content.split('\n');
      let currentY = layer.y;

      lines.forEach(line => {
        // Outline (SAMP Style)
        if (layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, layer.x, currentY);
        }

        // Shadow
        if (layer.shadowBlur > 0) {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Fill
        ctx.fillStyle = layer.color;
        ctx.fillText(line, layer.x, currentY);

        // Reset Shadow for next items
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        currentY += layer.fontSize * layer.lineHeight;
      });

      // Selection Box
      if (selectedLayerId === layer.id) {
        const metrics = ctx.measureText(lines.reduce((a, b) => a.length > b.length ? a : b, ''));
        const textHeight = lines.length * (layer.fontSize * layer.lineHeight);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(layer.x - 2, layer.y - 2, metrics.width + 4, textHeight + 4);
        ctx.setLineDash([]);
      }
    };

    // Helper to draw image
    const drawImage = (layer: ImageLayer) => {
      const img = loadedImages[layer.id];
      if (!img) return;

      ctx.save();
      // Apply filters
      ctx.filter = `brightness(${layer.filters.brightness}%) contrast(${layer.filters.contrast}%) saturation(${layer.filters.saturation}%) blur(${layer.filters.blur}px)`;
      
      // Position center pivot for rotation
      const centerX = layer.x + (layer.width * layer.scale) / 2;
      const centerY = layer.y + (layer.height * layer.scale) / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      ctx.drawImage(
        img, 
        layer.x, 
        layer.y, 
        layer.width * layer.scale, 
        layer.height * layer.scale
      );

      ctx.restore();

      // Selection Box
      if (selectedLayerId === layer.id) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(
          layer.x, 
          layer.y, 
          layer.width * layer.scale, 
          layer.height * layer.scale
        );
        ctx.restore();
      }
    };

    // Render loop
    // 1. Draw Images first (bottom up)
    [...layers].filter(l => l.visible).forEach(layer => {
      if (layer.type === LayerType.IMAGE) drawImage(layer as ImageLayer);
      if (layer.type === LayerType.TEXT) drawText(layer as TextLayer);
    });

  }, [layers, selectedLayerId, zoom, width, height, loadedImages]);

  // Mouse Handlers for Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    // Simple hit detection (reverse iterate to select top-most)
    const clickedLayer = [...layers].reverse().find(layer => {
        if(!layer.visible || layer.locked) return false;

        if (layer.type === LayerType.TEXT) {
            // Rough approximation for text hit box
            const tl = layer as TextLayer;
            const h = tl.fontSize * tl.lineHeight * tl.content.split('\n').length;
            // Assuming avg char width is ~0.6em
            const w = tl.content.length * (tl.fontSize * 0.5); 
            return mouseX >= tl.x && mouseX <= tl.x + w && mouseY >= tl.y && mouseY <= tl.y + h;
        } else if (layer.type === LayerType.IMAGE) {
            const il = layer as ImageLayer;
            const w = il.width * il.scale;
            const h = il.height * il.scale;
            return mouseX >= il.x && mouseX <= il.x + w && mouseY >= il.y && mouseY <= il.y + h;
        }
        return false;
    });

    if (clickedLayer) {
      onSelectLayer(clickedLayer.id);
      setIsDragging(true);
      setDragStart({ x: mouseX, y: mouseY });
      if (clickedLayer.type === LayerType.IMAGE) {
         setInitialLayerPos({ x: (clickedLayer as ImageLayer).x, y: (clickedLayer as ImageLayer).y });
      } else {
         setInitialLayerPos({ x: (clickedLayer as TextLayer).x, y: (clickedLayer as TextLayer).y });
      }
    } else {
      onSelectLayer(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedLayerId) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    onUpdateLayerPos(selectedLayerId, initialLayerPos.x + dx, initialLayerPos.y + dy);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative overflow-auto flex-1 flex justify-center items-center bg-[#1e1e20] shadow-inner p-8">
      <canvas
        ref={canvasRef}
        width={width * zoom}
        height={height * zoom}
        className="bg-black shadow-2xl border border-zinc-700"
        style={{ width: width * zoom, height: height * zoom, cursor: isDragging ? 'grabbing' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {layers.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-zinc-500 text-center">
               <p className="text-xl font-bold">Canvas Empty</p>
               <p className="text-sm">Upload an image or add text to start</p>
            </div>
         </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN APP
// ==========================================

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 }); // Default 720p

  const handleAddBaseImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        // Resize canvas to fit image
        setCanvasSize({ width: img.width, height: img.height });
        
        const newLayer: ImageLayer = {
          id: generateId(),
          type: LayerType.IMAGE,
          name: 'Base Image',
          visible: true,
          locked: true, // Lock base by default
          src,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          scale: 1,
          rotation: 0,
          filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0 }
        };
        // Add to bottom
        setLayers(prev => [newLayer, ...prev]);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = (text: string, color: string = '#FFFFFF', yOffset: number = 0) => {
      // Find optimal Y position (after last text layer or center)
      const lastTextLayer = [...layers].reverse().find(l => l.type === LayerType.TEXT) as TextLayer | undefined;
      const startY = lastTextLayer ? lastTextLayer.y + (lastTextLayer.fontSize * lastTextLayer.lineHeight) : 50;

      const newLayer: TextLayer = {
          id: generateId(),
          type: LayerType.TEXT,
          name: text.substring(0, 15),
          visible: true,
          locked: false,
          content: text,
          x: 50,
          y: yOffset ? yOffset : startY,
          fontSize: 14, // SAMP Standard-ish
          fontFamily: 'Arial, sans-serif',
          color: color,
          strokeColor: '#000000',
          strokeWidth: 2,
          shadowBlur: 0,
          lineHeight: 1.2,
          isBold: true,
          isItalic: false
      };
      setLayers(prev => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
  };

  const handleBulkAddText = (textItems: any[]) => {
      const newLayers = textItems.map((item) => {
           return {
                id: generateId(),
                type: LayerType.TEXT,
                name: 'Chat Line',
                visible: true,
                locked: false,
                content: item.content,
                x: 30, // Standard left padding
                y: item.y, // Calculated by parser
                fontSize: 13,
                fontFamily: 'Arial',
                color: item.color,
                strokeColor: '#000000',
                strokeWidth: 2,
                shadowBlur: 0,
                lineHeight: 1.1,
                isBold: true,
                isItalic: false
           } as TextLayer;
      });
      setLayers(prev => [...prev, ...newLayers]);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } as Layer : l));
  };

  const deleteLayer = (id: string) => {
      setLayers(prev => prev.filter(l => l.id !== id));
      if(selectedLayerId === id) setSelectedLayerId(null);
  };

  const duplicateLayer = () => {
      if(!selectedLayerId) return;
      const original = layers.find(l => l.id === selectedLayerId);
      if(!original) return;
      
      // Cast to any to access specific props easily, then spread
      const copy: any = { ...original };
      copy.id = generateId();
      copy.name = original.name + ' (Copy)';
      copy.x = original.x + 20;
      copy.y = original.y + 20;

      setLayers(prev => [...prev, copy as Layer]);
      setSelectedLayerId(copy.id);
  };
  
  const reorderLayers = (fromIndex: number, toIndex: number) => {
      const newLayers = [...layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      setLayers(newLayers);
  };

  const handleExport = () => {
      const canvas = document.querySelector('canvas');
      if(canvas) {
          downloadCanvas(canvas, `ssrp-export-${Date.now()}.png`);
      }
  };

  return (
    <div className="flex flex-col h-screen text-zinc-200">
      <Toolbar 
        zoom={zoom} 
        onZoomIn={() => setZoom(prev => Math.min(prev + 0.1, 3))} 
        onZoomOut={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}
        onExport={handleExport}
        onAddImage={handleAddBaseImage}
      />
      <div className="flex flex-1 overflow-hidden">
        <LayerManager 
            layers={layers}
            selectedId={selectedLayerId}
            onSelect={setSelectedLayerId}
            onAddText={handleAddText}
            onReorder={reorderLayers}
            onDelete={deleteLayer}
            onBulkAddText={handleBulkAddText}
        />
        <CanvasRenderer 
            width={canvasSize.width}
            height={canvasSize.height}
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayerPos={(id, x, y) => updateLayer(id, {x, y})}
            zoom={zoom}
            bgImage={null}
        />
        <PropertiesPanel 
            layer={layers.find(l => l.id === selectedLayerId) || null}
            onChange={(updates) => selectedLayerId && updateLayer(selectedLayerId, updates)}
            onDelete={() => selectedLayerId && deleteLayer(selectedLayerId)}
            onDuplicate={duplicateLayer}
        />
      </div>
    </div>
  );
};

// ==========================================
// ROOT
// ==========================================

console.log("SSRP Studio: Initializing...");

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SSRP Studio Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#18181b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#000', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.error?.message}
          </pre>
          <p style={{ marginTop: '1rem', color: '#a1a1aa' }}>Check the console for more details.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("SSRP Studio: Root element not found!");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("SSRP Studio: Mount called.");
  } catch (err) {
    console.error("SSRP Studio: Failed to mount.", err);
  }
}
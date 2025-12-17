import React, { Component, useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Download, ZoomIn, ZoomOut, Upload, Layers, 
  GripVertical, Type, Image as ImageIcon, ArrowUp, ArrowDown, Trash2,
  Copy, Move, Eye, EyeOff, Lock, Unlock, RefreshCw
} from 'lucide-react';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================

enum LayerType {
  IMAGE = 'image',
  TEXT = 'text',
}

interface BaseLayer {
  id: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  name: string;
}

interface ImageLayer extends BaseLayer {
  type: LayerType.IMAGE;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
}

interface TextLayer extends BaseLayer {
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

type Layer = ImageLayer | TextLayer;

const PRESET_COLORS = [
  { name: 'Talk (White)', value: '#FFFFFF' },
  { name: '/me (Purple)', value: '#C2A2DA' },
  { name: '/do (Soft Purple)', value: '#9A9AC1' },
  { name: 'PM (Yellow)', value: '#E6E600' },
  { name: 'Radio (Blue)', value: '#269BD2' },
  { name: 'Success (Green)', value: '#33AA33' },
  { name: 'Server (Cyan)', value: '#AAC5E3' },
  { name: 'Error (Red)', value: '#FF0000' },
];

// ==========================================
// 2. UTILITIES
// ==========================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const detectChatColor = (text: string): string => {
  const lower = text.toLowerCase();
  if (text.startsWith('*')) return '#C2A2DA';
  if (lower.includes('says:')) return '#FFFFFF';
  if (lower.includes('shouts:')) return '#FFFFFF'; 
  if (lower.includes('whispers:')) return '#FFFFFF';
  if (lower.startsWith('((') || lower.endsWith('))')) return '#A9C4E4';
  return '#FFFFFF';
};

const parseChatlog = (rawText: string, startY: number = 50): any[] => {
  const lines = rawText.split('\n').filter(l => l.trim() !== '');
  const layers: any[] = [];
  let currentY = startY;

  lines.forEach((line) => {
    const cleanText = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
    layers.push({
      content: cleanText,
      color: detectChatColor(cleanText),
      y: currentY
    });
    currentY += 24;
  });

  return layers;
};

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================

// --- Toolbar Component ---
const Toolbar = ({ onZoomIn, onZoomOut, zoom, onExport, onAddImage }) => (
  <div className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
    <div className="flex items-center space-x-6">
      <div className="flex items-center text-indigo-500 font-bold text-xl tracking-tight">
         <div className="bg-indigo-500/10 p-2 rounded-lg mr-3">
            <Layers className="w-6 h-6" />
         </div>
         SSRP Master
      </div>
      <div className="h-8 w-px bg-zinc-800"></div>
      
      <label className="flex items-center px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg cursor-pointer transition-all group">
        <Upload className="w-4 h-4 mr-2 group-hover:text-indigo-400 transition-colors" />
        Upload Base Image
        <input type="file" accept="image/*" onChange={onAddImage} className="hidden" />
      </label>
    </div>

    <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
      <button onClick={onZoomOut} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <span className="text-xs font-mono text-zinc-400 w-14 text-center select-none">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>

    <button 
      onClick={onExport}
      className="flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
    >
      <Download className="w-4 h-4 mr-2" />
      Export Result
    </button>
  </div>
);

// --- Layer Manager Component ---
const LayerManager = ({ layers, selectedId, onSelect, onAddText, onReorder, onBulkAddText }) => {
  const [activeTab, setActiveTab] = useState('chatlog');
  const [chatInput, setChatInput] = useState('');

  const handleChatParse = () => {
    if(!chatInput.trim()) return;
    onBulkAddText(parseChatlog(chatInput));
    setChatInput('');
    setActiveTab('layers');
  };

  return (
    <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0 z-10">
      <div className="flex border-b border-zinc-800">
        <button onClick={() => setActiveTab('layers')} className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>Layers</button>
        <button onClick={() => setActiveTab('chatlog')} className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'chatlog' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>Chatlog Tools</button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {activeTab === 'layers' ? (
          <div className="space-y-2">
            {[...layers].reverse().map((layer, reverseIndex) => {
              const realIndex = layers.length - 1 - reverseIndex;
              return (
                <div
                  key={layer.id}
                  onClick={() => onSelect(layer.id)}
                  className={`group flex items-center p-3 rounded-lg cursor-pointer border transition-all ${selectedId === layer.id ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-zinc-800/50 border-transparent hover:bg-zinc-800 hover:border-zinc-700'}`}
                >
                  <GripVertical className="w-4 h-4 mr-3 text-zinc-600" />
                  {layer.type === LayerType.TEXT ? <Type className="w-4 h-4 mr-3 text-blue-400" /> : <ImageIcon className="w-4 h-4 mr-3 text-green-400" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${selectedId === layer.id ? 'text-indigo-200' : 'text-zinc-300'}`}>
                        {layer.name || (layer.type === LayerType.TEXT ? (layer as any).content : 'Image Layer')}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                     <button onClick={(e) => { e.stopPropagation(); onReorder(realIndex, realIndex + 1); }} disabled={realIndex === layers.length - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                     <button onClick={(e) => { e.stopPropagation(); onReorder(realIndex, realIndex - 1); }} disabled={realIndex === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            })}
            {layers.length === 0 && <div className="text-center text-zinc-600 py-10 italic text-sm">No layers yet. Start by uploading an image or adding text.</div>}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-2 font-medium">QUICK ADD</p>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onAddText('Sample Text', '#FFFFFF')} className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 transition-colors flex items-center justify-center gap-2">Talk</button>
                    <button onClick={() => onAddText('* Action', '#C2A2DA')} className="py-2 px-3 bg-purple-900/20 hover:bg-purple-900/30 text-purple-300 text-xs rounded border border-purple-900/30 transition-colors flex items-center justify-center gap-2">/me</button>
                     <button onClick={() => onAddText('(( OOC ))', '#A9C4E4')} className="py-2 px-3 bg-blue-900/20 hover:bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-900/30 transition-colors flex items-center justify-center gap-2">/b</button>
                    <button onClick={() => onAddText('Radio', '#269BD2')} className="py-2 px-3 bg-cyan-900/20 hover:bg-cyan-900/30 text-cyan-300 text-xs rounded border border-cyan-900/30 transition-colors flex items-center justify-center gap-2">/r</button>
                </div>
             </div>
             
             <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800 flex flex-col h-64">
                <p className="text-xs text-zinc-400 mb-2 font-medium">CHATLOG PARSER</p>
                <textarea
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none placeholder-zinc-700"
                  placeholder="Paste your chatlog here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  onClick={handleChatParse}
                  disabled={!chatInput.trim()}
                  className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wide rounded shadow transition-all"
                >
                  Process Lines
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Properties Panel Component ---
const PropertiesPanel = ({ layer, onChange, onDelete, onDuplicate }) => {
  if (!layer) return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col items-center justify-center text-zinc-600 shrink-0 p-8">
       <Move className="w-12 h-12 mb-4 opacity-20" />
       <p className="text-sm font-medium">Select a layer to configure</p>
    </div>
  );

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shrink-0 z-10 overflow-y-auto">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 sticky top-0">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Properties</span>
        <div className="flex space-x-1">
            <button onClick={() => onChange({ visible: !layer.visible })} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">{layer.visible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}</button>
            <button onClick={() => onChange({ locked: !layer.locked })} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">{layer.locked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}</button>
            <button onClick={onDuplicate} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"><Copy className="w-4 h-4"/></button>
            <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>

      <div className="p-5 space-y-8">
        {/* TEXT SPECIFIC */}
        {layer.type === LayerType.TEXT && (
          <>
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400">Content</label>
              <textarea
                value={layer.content}
                onChange={(e) => onChange({ content: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
               <label className="text-xs font-medium text-zinc-400">Style</label>
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block mb-1">Size</span>
                    <input type="number" value={layer.fontSize} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} className="w-full bg-transparent text-sm text-zinc-200 outline-none font-mono" />
                  </div>
                  <div className="bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block mb-1">Line Height</span>
                    <input type="number" step="0.1" value={layer.lineHeight} onChange={(e) => onChange({ lineHeight: Number(e.target.value) })} className="w-full bg-transparent text-sm text-zinc-200 outline-none font-mono" />
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => onChange({ isBold: !layer.isBold })} className={`flex-1 py-1.5 text-xs rounded font-medium border ${layer.isBold ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-zinc-800 text-zinc-400'}`}>Bold</button>
                  <button onClick={() => onChange({ isItalic: !layer.isItalic })} className={`flex-1 py-1.5 text-xs rounded font-medium border ${layer.isItalic ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-800 border-zinc-800 text-zinc-400'}`}>Italic</button>
               </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400">Color Presets</label>
                <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map(c => (
                        <button key={c.name} onClick={() => onChange({ color: c.value })} title={c.name} className="w-full aspect-square rounded-md border border-zinc-700 hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: c.value }} />
                    ))}
                </div>
                <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded border border-zinc-800 mt-2">
                   <span className="text-xs text-zinc-500">Custom Hex</span>
                   <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-zinc-600" style={{backgroundColor: layer.color}}></div>
                      <input type="text" value={layer.color} onChange={(e) => onChange({ color: e.target.value })} className="w-16 bg-transparent text-xs text-right font-mono outline-none text-zinc-300" />
                   </div>
                </div>
            </div>
            
            <div className="space-y-3">
               <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-zinc-400">Stroke / Outline</label>
                  <span className="text-xs font-mono text-zinc-500">{layer.strokeWidth}px</span>
               </div>
               <input type="range" min="0" max="8" step="0.5" value={layer.strokeWidth} onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
          </>
        )}

        {/* IMAGE SPECIFIC */}
        {layer.type === LayerType.IMAGE && (
          <div className="space-y-6">
            <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400">Transform</label>
                 <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-800 space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1 uppercase"><span>Scale</span><span>{Math.round(layer.scale * 100)}%</span></div>
                        <input type="range" min="0.1" max="3" step="0.1" value={layer.scale} onChange={(e) => onChange({ scale: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1 uppercase"><span>Rotation</span><span>{layer.rotation}°</span></div>
                        <input type="range" min="0" max="360" step="1" value={layer.rotation} onChange={(e) => onChange({ rotation: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                 </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-zinc-800 space-y-3">
             <label className="text-xs font-medium text-zinc-400">Position</label>
             <div className="grid grid-cols-2 gap-3">
                 <div className="bg-zinc-950 rounded p-2 flex items-center justify-between border border-zinc-800">
                     <span className="text-[10px] text-zinc-500 font-bold ml-1">X</span>
                     <input type="number" value={Math.round(layer.x)} onChange={(e) => onChange({ x: Number(e.target.value) })} className="w-16 bg-transparent text-right outline-none text-xs font-mono text-zinc-300" />
                 </div>
                 <div className="bg-zinc-950 rounded p-2 flex items-center justify-between border border-zinc-800">
                     <span className="text-[10px] text-zinc-500 font-bold ml-1">Y</span>
                     <input type="number" value={Math.round(layer.y)} onChange={(e) => onChange({ y: Number(e.target.value) })} className="w-16 bg-transparent text-right outline-none text-xs font-mono text-zinc-300" />
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

// --- Canvas Component ---
const CanvasRenderer = ({ width, height, layers, selectedLayerId, onSelectLayer, onUpdateLayerPos, zoom }) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [images, setImages] = useState({});

  useEffect(() => {
    layers.forEach(l => {
      if (l.type === LayerType.IMAGE && !images[l.id]) {
        const img = new Image();
        img.src = l.src;
        img.onload = () => setImages(prev => ({ ...prev, [l.id]: img }));
      }
    });
  }, [layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear & Setup
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.scale(zoom, zoom);
    
    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render Layers
    [...layers].forEach(layer => {
      if (!layer.visible) return;

      if (layer.type === LayerType.IMAGE) {
        const img = images[layer.id];
        if (img) {
          ctx.save();
          // ctx.filter = ... (omitted for brevity, can add back)
          const cx = layer.x + (layer.width * layer.scale) / 2;
          const cy = layer.y + (layer.height * layer.scale) / 2;
          ctx.translate(cx, cy);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
          ctx.drawImage(img, layer.x, layer.y, layer.width * layer.scale, layer.height * layer.scale);
          ctx.restore();
          
          if (selectedLayerId === layer.id) {
             ctx.save();
             ctx.translate(cx, cy);
             ctx.rotate((layer.rotation * Math.PI) / 180);
             ctx.translate(-cx, -cy);
             ctx.strokeStyle = '#6366f1'; 
             ctx.lineWidth = 2 / zoom;
             ctx.strokeRect(layer.x, layer.y, layer.width * layer.scale, layer.height * layer.scale);
             ctx.restore();
          }
        }
      } else if (layer.type === LayerType.TEXT) {
        ctx.font = `${layer.isItalic ? 'italic' : 'normal'} ${layer.isBold ? 'bold' : 'normal'} ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lines = layer.content.split('\n');
        let cy = layer.y;
        
        lines.forEach(line => {
          if (layer.strokeWidth > 0) {
            ctx.strokeStyle = layer.strokeColor;
            ctx.lineWidth = layer.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(line, layer.x, cy);
          }
          ctx.fillStyle = layer.color;
          ctx.fillText(line, layer.x, cy);
          cy += layer.fontSize * layer.lineHeight;
        });

        if (selectedLayerId === layer.id) {
           const metrics = ctx.measureText(lines.reduce((a, b) => a.length > b.length ? a : b, ''));
           const h = lines.length * (layer.fontSize * layer.lineHeight);
           ctx.strokeStyle = '#6366f1';
           ctx.lineWidth = 1 / zoom;
           ctx.setLineDash([4/zoom, 4/zoom]);
           ctx.strokeRect(layer.x - 4, layer.y - 4, metrics.width + 8, h + 8);
           ctx.setLineDash([]);
        }
      }
    });
  }, [layers, images, zoom, width, height, selectedLayerId]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
    
    // Reverse find top-most
    const clicked = [...layers].reverse().find(l => {
        if (!l.visible || l.locked) return false;
        if (l.type === LayerType.TEXT) {
            // Approx hit test
            const lines = l.content.split('\n');
            const h = lines.length * (l.fontSize * l.lineHeight);
            const w = l.content.length * (l.fontSize * 0.6); // crude approx
            return mx >= l.x && mx <= l.x + w && my >= l.y && my <= l.y + h;
        }
        if (l.type === LayerType.IMAGE) {
            return mx >= l.x && mx <= l.x + (l.width*l.scale) && my >= l.y && my <= l.y + (l.height*l.scale);
        }
        return false;
    });

    if (clicked) {
        onSelectLayer(clicked.id);
        setIsDragging(true);
        setDragStart({ x: mx, y: my });
        setInitialPos({ x: clicked.x, y: clicked.y });
    } else {
        onSelectLayer(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedLayerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
    onUpdateLayerPos(selectedLayerId, initialPos.x + (mx - dragStart.x), initialPos.y + (my - dragStart.y));
  };

  return (
    <div className="flex-1 bg-[#18181b] overflow-hidden flex items-center justify-center relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="relative shadow-2xl shadow-black ring-1 ring-zinc-800">
            <canvas 
                ref={canvasRef} 
                width={width * zoom} 
                height={height * zoom}
                style={{ width: width * zoom, height: height * zoom, cursor: isDragging ? 'grabbing' : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
            />
            {layers.length === 0 && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-zinc-600 space-y-2">
                    <p className="font-mono text-xs uppercase tracking-widest opacity-50">Canvas Empty</p>
                </div>
            )}
        </div>
    </div>
  );
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

const App = () => {
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(0.8);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });

  const handleAddImage = (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result as string;
        img.onload = () => {
            setCanvasSize({ width: img.width, height: img.height });
            setZoom(Math.min(0.8, 1280 / img.width)); // Auto-fit zoom roughly
            const newLayer: ImageLayer = {
                id: generateId(),
                type: LayerType.IMAGE,
                name: 'Base Image',
                visible: true, locked: true,
                src: ev.target.result as string,
                x: 0, y: 0, width: img.width, height: img.height,
                scale: 1, rotation: 0,
                filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0 }
            };
            setLayers(prev => [newLayer, ...prev]);
        };
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleAddText = (text, color = '#FFFFFF', yOff = 0) => {
    const lastText = [...layers].reverse().find(l => l.type === LayerType.TEXT);
    const startY = lastText ? lastText.y + 30 : 50;
    const newL: TextLayer = {
        id: generateId(), type: LayerType.TEXT, name: text.substr(0,10),
        visible: true, locked: false,
        content: text,
        x: 50, y: yOff || startY,
        fontSize: 14, fontFamily: 'Arial',
        color: color, strokeColor: '#000000', strokeWidth: 2,
        shadowBlur: 0, lineHeight: 1.2, isBold: true, isItalic: false
    };
    setLayers(prev => [...prev, newL]);
    setSelectedId(newL.id);
  };

  const handleBulkAdd = (items) => {
      const newLayers = items.map(i => ({
        id: generateId(), type: LayerType.TEXT, name: 'Chat',
        visible: true, locked: false,
        content: i.content, x: 30, y: i.y,
        fontSize: 13, fontFamily: 'Arial', color: i.color,
        strokeColor: '#000000', strokeWidth: 2, shadowBlur: 0,
        lineHeight: 1.1, isBold: true, isItalic: false
      }));
      setLayers(prev => [...prev, ...newLayers]);
  };

  const updateLayer = (id, updates) => setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  const deleteLayer = (id) => { setLayers(prev => prev.filter(l => l.id !== id)); setSelectedId(null); };
  const duplicateLayer = () => {
    const original = layers.find(l => l.id === selectedId);
    if (!original) return;
    const copy = { ...original, id: generateId(), x: original.x + 20, y: original.y + 20, name: original.name + ' (Copy)' };
    setLayers(prev => [...prev, copy]);
    setSelectedId(copy.id);
  };
  const reorder = (from, to) => {
      if (to < 0 || to >= layers.length) return;
      const copy = [...layers];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      setLayers(copy);
  };

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `ssrp-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }
  };

  return (
    <div className="flex flex-col h-screen text-zinc-200">
       <Toolbar 
         zoom={zoom} 
         onZoomIn={() => setZoom(z => Math.min(z + 0.1, 3))} 
         onZoomOut={() => setZoom(z => Math.max(z - 0.1, 0.1))} 
         onExport={handleExport}
         onAddImage={handleAddImage}
       />
       <div className="flex flex-1 overflow-hidden">
          <LayerManager 
            layers={layers} selectedId={selectedId} onSelect={setSelectedId}
            onAddText={handleAddText} onBulkAddText={handleBulkAdd}
            onReorder={reorder}
          />
          <CanvasRenderer 
            width={canvasSize.width} height={canvasSize.height}
            layers={layers} selectedLayerId={selectedId}
            onSelectLayer={setSelectedId} onUpdateLayerPos={(id, x, y) => updateLayer(id, {x, y})}
            zoom={zoom}
          />
          <PropertiesPanel 
            layer={layers.find(l => l.id === selectedId)}
            onChange={(u) => updateLayer(selectedId, u)}
            onDelete={() => deleteLayer(selectedId)}
            onDuplicate={duplicateLayer}
          />
       </div>
    </div>
  );
};

// Mount
const rootEl = document.getElementById('root');
if (rootEl) {
    try {
        const root = createRoot(rootEl);
        root.render(<App />);
    } catch(e) {
        document.body.innerHTML = `<div style="color:red; padding:20px;">CRITICAL ERROR: ${e.message}</div>`;
    }
}

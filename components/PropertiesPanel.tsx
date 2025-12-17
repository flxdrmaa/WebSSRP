import React from 'react';
import { Layer, LayerType, TextLayer, ImageLayer, PRESET_COLORS } from '../types';
import { Trash2, Copy, Move, Type, Image as ImageIcon, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

interface PropertiesPanelProps {
  layer: Layer | null;
  onChange: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ layer, onChange, onDelete, onDuplicate }) => {
  if (!layer) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col items-center justify-center text-zinc-500">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Move className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-center font-medium">Select a layer to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
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

export default PropertiesPanel;

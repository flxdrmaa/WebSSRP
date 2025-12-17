import React, { useState } from 'react';
import { Layer, LayerType } from '../types';
import { GripVertical, Type, Image as ImageIcon, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { parseChatlog } from '../utils';

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
    <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
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

export default LayerManager;
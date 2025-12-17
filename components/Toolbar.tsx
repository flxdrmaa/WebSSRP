import React from 'react';
import { Download, ZoomIn, ZoomOut, Upload, FilePlus, Layers } from 'lucide-react';

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
  onExport: () => void;
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onZoomIn, onZoomOut, zoom, onExport, onAddImage }) => {
  return (
    <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
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

export default Toolbar;

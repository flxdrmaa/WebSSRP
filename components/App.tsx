import React, { useState } from 'react';
import { Layer, LayerType, TextLayer, ImageLayer } from '../types';
import { generateId, downloadCanvas } from '../utils';
import Toolbar from './Toolbar';
import LayerManager from './LayerManager';
import CanvasRenderer from './CanvasRenderer';
import PropertiesPanel from './PropertiesPanel';

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

export default App;
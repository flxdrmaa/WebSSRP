import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layer, LayerType, TextLayer, ImageLayer } from '../types';

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

export default CanvasRenderer;

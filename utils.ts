export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Heuristic to detect chat type based on common SAMP Roleplay formats
export const detectChatColor = (text: string): string => {
  const lower = text.toLowerCase();
  if (text.startsWith('*')) return '#C2A2DA'; // /me action
  if (lower.includes('says:')) return '#FFFFFF'; // Normal talk
  if (lower.includes('shouts:')) return '#FFFFFF'; 
  if (lower.includes('whispers:')) return '#FFFFFF';
  if (lower.startsWith('((') || lower.endsWith('))')) return '#A9C4E4'; // OOC
  return '#FFFFFF';
};

// Format text for chatlog parsing
export const parseChatlog = (rawText: string, startY: number = 50): any[] => {
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

export const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};

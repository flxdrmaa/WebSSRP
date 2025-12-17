export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
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

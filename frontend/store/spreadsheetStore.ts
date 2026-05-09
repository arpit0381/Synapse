import { create } from 'zustand';

export interface CellPosition {
  row: number;
  col: number;
}

export interface Range {
  start: CellPosition;
  end: CellPosition;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  bgColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  numberFormat?: 'currency' | 'percent' | 'none';
}

interface SpreadsheetState {
  // Navigation
  activeTabId: string | null;
  setActiveTabId: (id: string) => void;

  // Selection
  selectedRange: Range | null;
  activeCell: CellPosition | null;
  setSelection: (activeCell: CellPosition, range: Range | null) => void;

  // Editing state
  isEditing: boolean;
  editValue: string;
  setEditing: (isEditing: boolean, value?: string) => void;

  // Toolbar Formatting (UI State)
  currentFormat: CellFormat;
  updateCurrentFormat: (format: Partial<CellFormat>) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  activeTabId: null,
  setActiveTabId: (id) => set({ activeTabId: id }),

  selectedRange: null,
  activeCell: { row: 0, col: 0 },
  setSelection: (activeCell, range) => set({ activeCell, selectedRange: range, isEditing: false }),

  isEditing: false,
  editValue: '',
  setEditing: (isEditing, value = '') => set({ isEditing, editValue: value }),

  currentFormat: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: '#000000',
    bgColor: '#ffffff',
    textAlign: 'left',
    verticalAlign: 'bottom',
    bold: false,
    italic: false,
    underline: false,
    numberFormat: 'none',
  },
  updateCurrentFormat: (format) => set({ currentFormat: { ...get().currentFormat, ...format } })
}));

"use client";

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { CellFormat } from '@/store/spreadsheetStore';

interface CellProps {
  row: number;
  col: number;
  value: string;
  displayValue: string;
  format?: CellFormat;
  isActive: boolean;
  isEditing: boolean;
  isSelected: boolean;
  width: number;
  height: number;
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onMouseEnter: (row: number, col: number) => void;
  onDoubleClick: (row: number, col: number) => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const Cell = memo(({
  row, col, value, displayValue, format,
  isActive, isEditing, isSelected,
  width, height,
  onMouseDown, onMouseEnter, onDoubleClick, onChange, onKeyDown
}: CellProps) => {

  const hasContent = displayValue !== "" && displayValue !== null && displayValue !== undefined;

  const style: React.CSSProperties = {
    width,
    height,
    fontFamily: format?.fontFamily || 'Inter, sans-serif',
    fontSize: format?.fontSize ? `${format.fontSize}px` : '12px',
    fontWeight: format?.bold ? 'bold' : 'normal',
    fontStyle: format?.italic ? 'italic' : 'normal',
    textDecoration: [
      format?.underline ? 'underline' : '',
      format?.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
    color: format?.color || 'inherit',
    backgroundColor: format?.bgColor || (isSelected && !isActive ? 'hsl(var(--accent) / 0.1)' : (hasContent ? 'hsl(var(--background))' : 'transparent')),
    textAlign: format?.textAlign || 'left',
    display: 'flex',
    alignItems: format?.verticalAlign === 'top' ? 'flex-start' : format?.verticalAlign === 'middle' ? 'center' : 'flex-end',
    justifyContent: format?.textAlign === 'center' ? 'center' : format?.textAlign === 'right' ? 'flex-end' : 'flex-start',
    whiteSpace: format?.wrap ? 'normal' : 'nowrap',
    overflow: format?.wrap ? 'hidden' : 'visible',
    padding: '0 4px',
    userSelect: 'none',
    zIndex: isActive ? 20 : (hasContent ? 10 : 1),
  };

  if (isEditing && isActive) {
    return (
      <div className="absolute inset-0 z-30 bg-background shadow-lg shadow-accent/20 border-2 border-accent">
        <input
          autoFocus
          className="w-full h-full border-none outline-none bg-transparent px-1"
          style={{ ...style, backgroundColor: 'transparent', width: '100%', height: '100%' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {}} // blur handled by grid
        />
      </div>
    );
  }

  let finalDisplayValue = displayValue;
  if (format?.numberFormat && displayValue && !isNaN(Number(displayValue))) {
    const num = Number(displayValue);
    if (format.numberFormat === 'currency') {
      finalDisplayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    } else if (format.numberFormat === 'percent') {
      finalDisplayValue = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(num);
    }
  }

  return (
    <div
      className={cn(
        "absolute inset-0 border-r border-b border-border/50 cursor-cell transition-colors",
        isActive && !isEditing && "border-2 border-accent z-20"
      )}
      style={style}
      onMouseDown={(e) => onMouseDown(row, col, e)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onDoubleClick={() => onDoubleClick(row, col)}
    >
      {finalDisplayValue}
    </div>
  );
});

Cell.displayName = 'Cell';

export default Cell;

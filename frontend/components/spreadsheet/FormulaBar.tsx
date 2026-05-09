"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';

interface FormulaBarProps {
  onFormulaSubmit: (value: string) => void;
  cellValue: string;
}

export default function FormulaBar({ onFormulaSubmit, cellValue }: FormulaBarProps) {
  const { activeCell, isEditing, setEditing } = useSpreadsheetStore();
  const [localValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert row/col to A1 notation
  const getColName = (col: number) => {
    let name = '';
    let c = col;
    while (c >= 0) {
      name = String.fromCharCode((c % 26) + 65) + name;
      c = Math.floor(c / 26) - 1;
    }
    return name;
  };
  const activeCellRef = activeCell ? `${getColName(activeCell.col)}${activeCell.row + 1}` : '';

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(cellValue);
    }
  }, [cellValue, isEditing, activeCell]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFormulaSubmit(localValue);
      setEditing(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setLocalValue(cellValue);
      setEditing(false);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (!isEditing) setEditing(true, e.target.value);
  };

  return (
    <div className="h-10 border-b border-border bg-background flex items-center px-2 gap-2 select-none z-10 relative">
      <div className="flex-shrink-0 w-16 text-center border-r border-border px-2 py-1 text-sm font-medium text-muted-foreground flex items-center justify-center">
        {activeCellRef}
      </div>
      
      <div className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-black italic text-muted-foreground bg-muted">
        fx
      </div>
      
      <div className="flex-1 h-full py-1 pr-2">
        <input 
          ref={inputRef}
          type="text" 
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter formula or data"
          className="w-full h-full bg-transparent border-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 px-2"
          onFocus={() => { if(!isEditing) setEditing(true, localValue); }}
        />
      </div>
    </div>
  );
}

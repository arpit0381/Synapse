"use client";

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSpreadsheetStore, CellPosition, Range } from '@/store/spreadsheetStore';
import Cell from './Cell';

interface GridAreaProps {
  data: Record<string, any>;
  evaluations: Record<string, any>;
  onCellChange: (row: number, col: number, value: string) => void;
  onCellsChange?: (updates: {row: number, col: number, value: string}[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  rowCount: number;
  colCount: number;
}

const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_COL_WIDTH = 100;
const HEADER_WIDTH = 40;
const HEADER_HEIGHT = 24;

export default function GridArea({ data, evaluations, onCellChange, onCellsChange, onUndo, onRedo, rowCount, colCount }: GridAreaProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const { activeCell, selectedRange, isEditing, setSelection, setEditing, editValue } = useSpreadsheetStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillRange, setFillRange] = useState<Range | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => DEFAULT_ROW_HEIGHT,
    overscan: 5,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: colCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => DEFAULT_COL_WIDTH,
    overscan: 5,
  });

  const getColName = (col: number) => {
    let name = '';
    let c = col;
    while (c >= 0) {
      name = String.fromCharCode((c % 26) + 65) + name;
      c = Math.floor(c / 26) - 1;
    }
    return name;
  };

  const handleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (isEditing && activeCell?.row === row && activeCell?.col === col) return;
    
    setSelection({ row, col }, { start: { row, col }, end: { row, col } });
    setIsDragging(true);
  }, [isEditing, activeCell, setSelection]);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isDragging && activeCell) {
      setSelection(activeCell, {
        start: { row: Math.min(activeCell.row, row), col: Math.min(activeCell.col, col) },
        end: { row: Math.max(activeCell.row, row), col: Math.max(activeCell.col, col) }
      });
    } else if (isFillDragging && selectedRange) {
      // One-dimensional dragging for fill handle
      const sr = selectedRange;
      const newRange = { ...sr };
      
      const dr = row - sr.end.row;
      const dc = col - sr.end.col;
      
      if (Math.abs(dr) > Math.abs(dc)) {
        if (row > sr.end.row) newRange.end.row = row;
        else if (row < sr.start.row) newRange.start.row = row;
      } else {
        if (col > sr.end.col) newRange.end.col = col;
        else if (col < sr.start.col) newRange.start.col = col;
      }
      setFillRange(newRange);
    }
  }, [isDragging, isFillDragging, activeCell, selectedRange, setSelection]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (isFillDragging && fillRange && selectedRange) {
      const updates: {row: number, col: number, value: string}[] = [];
      const sr = selectedRange;
      
      const width = sr.end.col - sr.start.col + 1;
      const height = sr.end.row - sr.start.row + 1;

      // Fill down
      if (fillRange.end.row > sr.end.row) {
        for (let r = sr.end.row + 1; r <= fillRange.end.row; r++) {
          const sourceRow = sr.start.row + ((r - sr.end.row - 1) % height);
          for (let c = sr.start.col; c <= sr.end.col; c++) {
            updates.push({ row: r, col: c, value: data[`${sourceRow},${c}`]?.formula || data[`${sourceRow},${c}`]?.value || "" });
          }
        }
      }
      // Fill up
      else if (fillRange.start.row < sr.start.row) {
        for (let r = fillRange.start.row; r < sr.start.row; r++) {
          const sourceRow = sr.end.row - ((sr.start.row - r - 1) % height);
          for (let c = sr.start.col; c <= sr.end.col; c++) {
            updates.push({ row: r, col: c, value: data[`${sourceRow},${c}`]?.formula || data[`${sourceRow},${c}`]?.value || "" });
          }
        }
      }
      // Fill right
      else if (fillRange.end.col > sr.end.col) {
        for (let c = sr.end.col + 1; c <= fillRange.end.col; c++) {
          const sourceCol = sr.start.col + ((c - sr.end.col - 1) % width);
          for (let r = sr.start.row; r <= sr.end.row; r++) {
            updates.push({ row: r, col: c, value: data[`${r},${sourceCol}`]?.formula || data[`${r},${sourceCol}`]?.value || "" });
          }
        }
      }
      // Fill left
      else if (fillRange.start.col < sr.start.col) {
        for (let c = fillRange.start.col; c < sr.start.col; c++) {
          const sourceCol = sr.end.col - ((sr.start.col - c - 1) % width);
          for (let r = sr.start.row; r <= sr.end.row; r++) {
            updates.push({ row: r, col: c, value: data[`${r},${sourceCol}`]?.formula || data[`${r},${sourceCol}`]?.value || "" });
          }
        }
      }

      if (onCellsChange && updates.length > 0) {
        onCellsChange(updates);
      }
      
      setSelection(activeCell!, fillRange);
      setIsFillDragging(false);
      setFillRange(null);
    } else {
      setIsFillDragging(false);
      setFillRange(null);
    }
  }, [isDragging, isFillDragging, fillRange, selectedRange, activeCell, data, onCellsChange, setSelection]);

  const handleDoubleClick = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    const cellData = data[key];
    setEditing(true, cellData?.formula || cellData?.value || "");
  }, [data, setEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return;
    
    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && !isEditing) {
      if (e.key.toLowerCase() === 'z') {
        if (e.shiftKey && onRedo) onRedo();
        else if (onUndo) onUndo();
        e.preventDefault();
        return;
      }
      if (e.key.toLowerCase() === 'y' && onRedo) {
        onRedo();
        e.preventDefault();
        return;
      }
    }
    
    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isEditing) {
      if (!selectedRange) return;
      let tsv = '';
      for (let r = selectedRange.start.row; r <= selectedRange.end.row; r++) {
        const rowData = [];
        for (let c = selectedRange.start.col; c <= selectedRange.end.col; c++) {
          const cell = data[`${r},${c}`];
          rowData.push(cell?.value || "");
        }
        tsv += rowData.join('\t') + '\n';
      }
      navigator.clipboard.writeText(tsv);
      e.preventDefault();
      return;
    }

    // Paste
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isEditing) {
      navigator.clipboard.readText().then(text => {
        if (!text) return;
        const rows = text.split('\n').map(r => r.split('\t'));
        // Remove trailing empty row from TSV newline
        if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
          rows.pop();
        }
        
        const updates: {row: number, col: number, value: string}[] = [];
        for (let i = 0; i < rows.length; i++) {
          for (let j = 0; j < rows[i].length; j++) {
            updates.push({
              row: activeCell.row + i,
              col: activeCell.col + j,
              value: rows[i][j]
            });
          }
        }
        if (onCellsChange && updates.length > 0) {
          onCellsChange(updates);
        }
      });
      e.preventDefault();
      return;
    }

    if (isEditing) {
      if (e.key === 'Enter') {
        onCellChange(activeCell.row, activeCell.col, editValue);
        setEditing(false);
        setSelection({ row: activeCell.row + 1, col: activeCell.col }, null);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setEditing(false);
        e.preventDefault();
      }
      return;
    }

    if (e.key.startsWith('Arrow')) {
      const isShift = e.shiftKey;
      const targetRow = e.key === 'ArrowUp' ? Math.max(0, (isShift && selectedRange ? selectedRange.end.row : activeCell.row) - 1) :
                        e.key === 'ArrowDown' ? Math.min(rowCount - 1, (isShift && selectedRange ? selectedRange.end.row : activeCell.row) + 1) :
                        isShift && selectedRange ? selectedRange.end.row : activeCell.row;
                        
      const targetCol = e.key === 'ArrowLeft' ? Math.max(0, (isShift && selectedRange ? selectedRange.end.col : activeCell.col) - 1) :
                        e.key === 'ArrowRight' ? Math.min(colCount - 1, (isShift && selectedRange ? selectedRange.end.col : activeCell.col) + 1) :
                        isShift && selectedRange ? selectedRange.end.col : activeCell.col;

      if (isShift) {
        setSelection(activeCell, {
          start: { row: Math.min(activeCell.row, targetRow), col: Math.min(activeCell.col, targetCol) },
          end: { row: Math.max(activeCell.row, targetRow), col: Math.max(activeCell.col, targetCol) }
        });
      } else {
        setSelection({ row: targetRow, col: targetCol }, { start: { row: targetRow, col: targetCol }, end: { row: targetRow, col: targetCol } });
      }
      e.preventDefault();
      return;
    }
    
    if (e.key === 'Enter' || e.key === 'F2') {
      const key = `${activeCell.row},${activeCell.col}`;
      const cellData = data[key];
      setEditing(true, cellData?.formula || cellData?.value || "");
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing directly
      setEditing(true, e.key);
      e.preventDefault();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      onCellChange(activeCell.row, activeCell.col, "");
    }
  }, [activeCell, isEditing, editValue, onCellChange, setEditing, setSelection, rowCount, colCount, data]);

  // Calculate Selection Box coordinates
  const selectionBox = useMemo(() => {
    if (!selectedRange) return null;
    const { start, end } = selectedRange;
    
    let top = 0;
    for(let i=0; i<start.row; i++) top += DEFAULT_ROW_HEIGHT;
    
    let left = 0;
    for(let i=0; i<start.col; i++) left += DEFAULT_COL_WIDTH;
    
    let width = 0;
    for(let i=start.col; i<=end.col; i++) width += DEFAULT_COL_WIDTH;
    
    let height = 0;
    for(let i=start.row; i<=end.row; i++) height += DEFAULT_ROW_HEIGHT;

    return { top, left, width, height };
  }, [selectedRange]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-background overflow-hidden relative select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Corner */}
      <div className="absolute top-0 left-0 z-40 bg-muted border-r border-b border-border flex items-center justify-center text-muted-foreground" style={{ width: HEADER_WIDTH, height: HEADER_HEIGHT }} />
      
      {/* Column Headers */}
      <div className="absolute top-0 z-30 bg-muted border-b border-border overflow-hidden" style={{ left: HEADER_WIDTH, right: 0, height: HEADER_HEIGHT }}>
        <div style={{ transform: `translateX(${-(colVirtualizer.scrollOffset || 0)}px)` }}>
          {colVirtualizer.getVirtualItems().map((virtualCol) => (
            <div
              key={virtualCol.index}
              className="absolute top-0 h-full border-r border-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
              style={{ left: virtualCol.start, width: virtualCol.size }}
              onClick={() => setSelection({ row: 0, col: virtualCol.index }, { start: { row: 0, col: virtualCol.index }, end: { row: rowCount - 1, col: virtualCol.index } })}
            >
              {getColName(virtualCol.index)}
            </div>
          ))}
        </div>
      </div>

      {/* Row Headers */}
      <div className="absolute left-0 z-30 bg-muted border-r border-border overflow-hidden" style={{ top: HEADER_HEIGHT, bottom: 0, width: HEADER_WIDTH }}>
        <div style={{ transform: `translateY(${-(rowVirtualizer.scrollOffset || 0)}px)` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              className="absolute left-0 w-full border-b border-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors"
              style={{ top: virtualRow.start, height: virtualRow.size }}
              onClick={() => setSelection({ row: virtualRow.index, col: 0 }, { start: { row: virtualRow.index, col: 0 }, end: { row: virtualRow.index, col: colCount - 1 } })}
            >
              {virtualRow.index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Grid Area */}
      <div 
        ref={parentRef}
        className="absolute inset-0 overflow-auto z-10"
        style={{ top: HEADER_HEIGHT, left: HEADER_WIDTH }}
      >
        <div
          style={{
            width: colVirtualizer.getTotalSize(),
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
            backgroundColor: '#fff',
          }}
          className="dark:bg-[#1a1b1e]"
        >
          {/* Virtualized Cells */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <React.Fragment key={virtualRow.index}>
              {colVirtualizer.getVirtualItems().map((virtualCol) => {
                const row = virtualRow.index;
                const col = virtualCol.index;
                const key = `${row},${col}`;
                const cellData = data[key];
                const evalData = evaluations[key];
                const isActive = activeCell?.row === row && activeCell?.col === col;
                const isSelected = selectedRange ? (
                  row >= selectedRange.start.row && row <= selectedRange.end.row &&
                  col >= selectedRange.start.col && col <= selectedRange.end.col
                ) : false;

                return (
                  <div
                    key={key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `translate(${virtualCol.start}px, ${virtualRow.start}px)`,
                      width: virtualCol.size,
                      height: virtualRow.size,
                    }}
                  >
                    <Cell
                      row={row}
                      col={col}
                      value={isActive && isEditing ? editValue : (cellData?.formula || cellData?.value || "")}
                      displayValue={evalData !== undefined ? evalData : (cellData?.value || "")}
                      format={cellData?.format}
                      isActive={isActive}
                      isEditing={isEditing}
                      isSelected={isSelected}
                      width={virtualCol.size}
                      height={virtualRow.size}
                      onMouseDown={handleMouseDown}
                      onMouseEnter={handleMouseEnter}
                      onDoubleClick={handleDoubleClick}
                      onChange={(v) => setEditing(true, v)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* Selection Overlay */}
          {selectionBox && !isEditing && (
            <div 
              className="absolute border-2 border-accent bg-accent/10 pointer-events-none z-20"
              style={{
                top: selectionBox.top,
                left: selectionBox.left,
                width: selectionBox.width,
                height: selectionBox.height
              }}
            >
              {/* Fill Handle */}
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-2 h-2 bg-accent border border-white cursor-crosshair pointer-events-auto" 
                onMouseDown={(e) => { e.stopPropagation(); setIsFillDragging(true); setFillRange(selectedRange); }}
              />
            </div>
          )}

          {/* Fill Range Outline */}
          {isFillDragging && fillRange && (
            <div 
              className="absolute border border-dashed border-accent pointer-events-none z-30"
              style={{
                top: Array.from({length: fillRange.start.row}).reduce((acc: number) => acc + DEFAULT_ROW_HEIGHT, 0),
                left: Array.from({length: fillRange.start.col}).reduce((acc: number) => acc + DEFAULT_COL_WIDTH, 0),
                width: Array.from({length: fillRange.end.col - fillRange.start.col + 1}).reduce((acc: number) => acc + DEFAULT_COL_WIDTH, 0),
                height: Array.from({length: fillRange.end.row - fillRange.start.row + 1}).reduce((acc: number) => acc + DEFAULT_ROW_HEIGHT, 0)
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

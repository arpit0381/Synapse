"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);
import { Plus, Minus, Calculator } from "lucide-react";

interface SheetEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 10;

const getColumnDefs = (numCols: number) => {
  const cols = [];
  for (let i = 0; i < numCols; i++) {
    // A, B, C... Z, AA, AB...
    let colName = "";
    let temp = i;
    while (temp >= 0) {
      colName = String.fromCharCode((temp % 26) + 65) + colName;
      temp = Math.floor(temp / 26) - 1;
    }
    cols.push({
      field: `col_${i}`,
      headerName: colName,
      editable: true,
      minWidth: 100,
    });
  }
  return cols;
};

export default function SheetEditor({ content, onChange }: SheetEditorProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [colDefs, setColDefs] = useState<any[]>([]);

  useEffect(() => {
    try {
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.rows && parsed.cols) {
          setRowData(parsed.rows);
          setColDefs(getColumnDefs(parsed.cols));
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse sheet content", e);
    }
    
    // Default empty sheet
    const initialCols = getColumnDefs(DEFAULT_COLS);
    const initialRows = Array.from({ length: DEFAULT_ROWS }, () => ({}));
    setColDefs(initialCols);
    setRowData(initialRows);
  }, [content]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  const handleCellValueChanged = useCallback((params: any) => {
    if (!gridRef.current) return;
    const allRowData: any[] = [];
    gridRef.current.api.forEachNode((node) => allRowData.push(node.data));
    onChange(JSON.stringify({ rows: allRowData, cols: colDefs.length }));
  }, [colDefs.length, onChange]);

  const addRow = () => {
    const newRows = [...rowData, {}];
    setRowData(newRows);
    onChange(JSON.stringify({ rows: newRows, cols: colDefs.length }));
  };

  const addColumn = () => {
    const newColsCount = colDefs.length + 1;
    const newColDefs = getColumnDefs(newColsCount);
    setColDefs(newColDefs);
    onChange(JSON.stringify({ rows: rowData, cols: newColsCount }));
  };

  return (
    <div className="h-full flex flex-col w-full">
      <div className="flex items-center gap-2 p-2 border-b border-border bg-surface">
        <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-accent/20 hover:text-accent transition-colors">
          <Plus className="w-4 h-4" /> Row
        </button>
        <button onClick={addColumn} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-accent/20 hover:text-accent transition-colors">
          <Plus className="w-4 h-4" /> Column
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-muted-foreground text-xs px-2">
          <Calculator className="w-4 h-4" />
          <span>Formulas not yet supported</span>
        </div>
      </div>
      
      <div className="flex-1 w-full relative">
        <div className="absolute inset-0 ag-theme-quartz-dark w-full h-full">
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            onCellValueChanged={handleCellValueChanged}
            suppressMovableColumns={true}
            rowSelection="multiple"
            suppressFieldDotNotation={true}
          />
        </div>
      </div>
    </div>
  );
}

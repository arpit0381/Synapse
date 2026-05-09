"use client";

import React, { useEffect, useState } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { useSpreadsheetEngine } from '@/lib/hyperformula-sync';
import Toolbar from './Toolbar';
import FormulaBar from './FormulaBar';
import GridArea from './GridArea';
import BottomTabs from './BottomTabs';
import { useAppStore } from '@/store/appStore';

interface SpreadsheetEngineProps {
  sheetId: string;
}

export default function SpreadsheetEngine({ sheetId }: SpreadsheetEngineProps) {
  const { user } = useAppStore();
  const { activeTabId, setActiveTabId, activeCell, selectedRange, isEditing, currentFormat } = useSpreadsheetStore();
  const [tabs, setTabs] = useState<any[]>([]);

  // Fetch Tabs
  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await fetch(`/api/apps/sheets/${sheetId}/tabs`);
        if (res.ok) {
          const data = await res.json();
          setTabs(data.tabs || []);
          if (data.tabs?.length > 0 && !activeTabId) {
            setActiveTabId(data.tabs[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch tabs", e);
      }
    };
    fetchTabs();
  }, [sheetId, activeTabId, setActiveTabId]);

  const { data, evaluations, updateCell, updateCells, undo, redo, canUndo, canRedo } = useSpreadsheetEngine({
    sheetId,
    tabId: activeTabId,
    userId: user?.id || ""
  });

  const handleCellChange = (row: number, col: number, value: string) => {
    updateCell(row, col, value, currentFormat);
  };

  const handleFormulaSubmit = (value: string) => {
    if (activeCell) {
      updateCell(activeCell.row, activeCell.col, value, currentFormat);
    }
  };

  const handleAddTab = async () => {
    try {
      const res = await fetch(`/api/apps/sheets/${sheetId}/tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Sheet${tabs.length + 1}`,
          index: tabs.length,
          created_by: user?.id
        })
      });
      if (res.ok) {
        const { tab } = await res.json();
        setTabs([...tabs, tab]);
        setActiveTabId(tab.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameTab = async (id: string, newTitle: string) => {
    setTabs(tabs.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  const handleDeleteTab = async (id: string) => {
    setTabs(tabs.filter(t => t.id !== id));
    if (activeTabId === id && tabs.length > 1) {
      setActiveTabId(tabs[tabs.findIndex(t => t.id === id) === 0 ? 1 : 0].id);
    }
  };

  const handleSetColor = async (id: string, color: string | null) => {
    setTabs(tabs.map(t => t.id === id ? { ...t, color } : t));
  };

  const activeCellValue = activeCell && data[`${activeCell.row},${activeCell.col}`]
    ? (data[`${activeCell.row},${activeCell.col}`].formula || data[`${activeCell.row},${activeCell.col}`].value || "")
    : "";

  const handleApplyFormat = (newFormat: any) => {
    if (!selectedRange) return;
    
    const updates = [];
    for (let r = selectedRange.start.row; r <= selectedRange.end.row; r++) {
      for (let c = selectedRange.start.col; c <= selectedRange.end.col; c++) {
        const key = `${r},${c}`;
        const existingCell = data[key] || {};
        const mergedFormat = { ...(existingCell.format || {}), ...newFormat };
        const valueOrFormula = existingCell.formula || existingCell.value || "";
        updates.push({
          row: r, col: c, value: valueOrFormula, format: mergedFormat
        });
      }
    }
    
    if (updates.length > 0) {
      updateCells(updates);
    }
  };

  if (!activeTabId) return null;

  return (
    <div className="flex flex-col h-full w-full relative">
      <Toolbar 
        onApplyFormat={handleApplyFormat} 
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <FormulaBar onFormulaSubmit={handleFormulaSubmit} cellValue={activeCellValue} />
      
      <div className="flex-1 relative overflow-hidden">
        <GridArea 
          data={data}
          evaluations={evaluations}
          onCellChange={handleCellChange}
          onCellsChange={updateCells}
          onUndo={undo}
          onRedo={redo}
          rowCount={1000} // 1000 rows
          colCount={52}  // A to AZ
        />
      </div>

      <BottomTabs 
        tabs={tabs}
        onAddTab={handleAddTab}
        onRenameTab={handleRenameTab}
        onDeleteTab={handleDeleteTab}
        onSetColor={handleSetColor}
      />
    </div>
  );
}

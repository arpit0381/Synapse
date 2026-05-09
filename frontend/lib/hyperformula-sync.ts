import { useEffect, useState, useRef, useCallback } from 'react';
import { HyperFormula } from 'hyperformula';
import { supabase } from './supabase';

interface CellData {
  row: number;
  col: number;
  value: string;
  formula: string;
  format?: any;
}

interface UseSpreadsheetEngineProps {
  sheetId: string;
  tabId: string | null;
  userId: string;
}

export function useSpreadsheetEngine({ sheetId, tabId, userId }: UseSpreadsheetEngineProps) {
  const [data, setData] = useState<Record<string, CellData>>({});
  const [evaluations, setEvaluations] = useState<Record<string, string>>({});
  const [hfInstance, setHfInstance] = useState<HyperFormula | null>(null);

  const channelRef = useRef<any>(null);

  // Initialize HyperFormula
  useEffect(() => {
    const hf = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3',
    });
    setHfInstance(hf);
    return () => {
      hf.destroy();
    };
  }, []);

  // Fetch initial data and setup realtime
  useEffect(() => {
    if (!tabId || !hfInstance) return;

    let mounted = true;

    const fetchInitial = async () => {
      const { data: cells, error } = await supabase
        .from('sheet_cells')
        .select('*')
        .eq('tab_id', tabId);
      
      if (error || !mounted) return;

      const newMap: Record<string, CellData> = {};
      const hfSheetName = `Tab_${tabId.replace(/-/g, '_')}`;
      
      if (!hfInstance.doesSheetExist(hfSheetName)) {
        hfInstance.addSheet(hfSheetName);
      }
      const sheetId = hfInstance.getSheetId(hfSheetName)!;

      cells.forEach((cell: any) => {
        newMap[`${cell.row_index},${cell.col_index}`] = {
          row: cell.row_index,
          col: cell.col_index,
          value: cell.value,
          formula: cell.formula,
          format: cell.format,
        };
        
        // Push to HF
        if (cell.formula) {
           hfInstance.setCellContents({ sheet: sheetId, row: cell.row_index, col: cell.col_index }, [[cell.formula]]);
        } else if (cell.value) {
           hfInstance.setCellContents({ sheet: sheetId, row: cell.row_index, col: cell.col_index }, [[cell.value]]);
        }
      });

      setData(newMap);
      updateEvaluations(newMap, sheetId);
    };

    const setupRealtime = () => {
      // Use a unique channel name to prevent "already subscribed" errors during React Strict Mode rapid re-mounts
      const channelName = `tab_${tabId}_${Math.random().toString(36).substring(2, 9)}`;
      channelRef.current = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sheet_cells', filter: `tab_id=eq.${tabId}` }, payload => {
           handleRealtimeUpdate(payload);
        })
        .subscribe();
    };

    fetchInitial().then(setupRealtime);

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [tabId, hfInstance]);

  const updateEvaluations = (currentData: Record<string, CellData>, hfSheetId: number) => {
    if (!hfInstance) return;
    const newEvals: Record<string, string> = {};
    Object.values(currentData).forEach(cell => {
      const val = hfInstance.getCellValue({ sheet: hfSheetId, row: cell.row, col: cell.col });
      newEvals[`${cell.row},${cell.col}`] = val?.toString() || "";
    });
    setEvaluations(newEvals);
  };

  const handleRealtimeUpdate = (payload: any) => {
    if (!hfInstance || !tabId) return;
    const hfSheetName = `Tab_${tabId.replace(/-/g, '_')}`;
    if (!hfInstance.doesSheetExist(hfSheetName)) {
      hfInstance.addSheet(hfSheetName);
    }
    const sheetId = hfInstance.getSheetId(hfSheetName)!;

    setData(prev => {
      const newMap = { ...prev };
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const cell = payload.new;
        newMap[`${cell.row_index},${cell.col_index}`] = {
          row: cell.row_index,
          col: cell.col_index,
          value: cell.value,
          formula: cell.formula,
          format: cell.format
        };
        
        if (cell.formula) {
           hfInstance.setCellContents({ sheet: sheetId, row: cell.row_index, col: cell.col_index }, [[cell.formula]]);
        } else {
           hfInstance.setCellContents({ sheet: sheetId, row: cell.row_index, col: cell.col_index }, [[cell.value || ""]]);
        }
      } else if (payload.eventType === 'DELETE') {
        const cell = payload.old;
        delete newMap[`${cell.row_index},${cell.col_index}`];
        hfInstance.setCellContents({ sheet: sheetId, row: cell.row_index, col: cell.col_index }, [[""]]);
      }
      updateEvaluations(newMap, sheetId);
      return newMap;
    });
  };

  const [undoStack, setUndoStack] = useState<{row: number, col: number, prevValue: string, prevFormula: string, nextValue: string, nextFormula: string}[][]>([]);
  const [redoStack, setRedoStack] = useState<{row: number, col: number, prevValue: string, prevFormula: string, nextValue: string, nextFormula: string}[][]>([]);

  const pushHistory = (action: {row: number, col: number, prevValue: string, prevFormula: string, nextValue: string, nextFormula: string}[]) => {
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]);
  };

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    
    // Reverse the action
    const updates = action.map(a => ({
      row: a.row, col: a.col, value: a.prevFormula || a.prevValue
    }));
    await updateCells(updates, false); // false = don't push to history
  }, [undoStack]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    
    // Re-apply the action
    const updates = action.map(a => ({
      row: a.row, col: a.col, value: a.nextFormula || a.nextValue
    }));
    await updateCells(updates, false);
  }, [redoStack]);

  const updateCell = useCallback(async (row: number, col: number, valueOrFormula: string, format?: any, saveHistory = true) => {
    if (!tabId || !hfInstance) return;

    const isFormula = valueOrFormula.startsWith('=');
    const value = isFormula ? "" : valueOrFormula;
    const formula = isFormula ? valueOrFormula : "";

    const hfSheetName = `Tab_${tabId.replace(/-/g, '_')}`;
    if (!hfInstance.doesSheetExist(hfSheetName)) {
      hfInstance.addSheet(hfSheetName);
    }
    const sheetId = hfInstance.getSheetId(hfSheetName)!;

    // Optimistic UI Update
    setData(prev => {
      const existing = prev[`${row},${col}`] || {};
      if (saveHistory) {
        pushHistory([{
          row, col, 
          prevValue: existing.value || "", prevFormula: existing.formula || "",
          nextValue: value, nextFormula: formula
        }]);
      }

      const newMap = { ...prev };
      newMap[`${row},${col}`] = { ...newMap[`${row},${col}`], row, col, value, formula, format: format || newMap[`${row},${col}`]?.format };
      
      if (formula) {
        hfInstance.setCellContents({ sheet: sheetId, row, col }, [[formula]]);
      } else {
        hfInstance.setCellContents({ sheet: sheetId, row, col }, [[value]]);
      }
      updateEvaluations(newMap, sheetId);
      return newMap;
    });

    // DB Sync
    await supabase.from('sheet_cells').upsert({
      tab_id: tabId,
      row_index: row,
      col_index: col,
      value,
      formula,
      format,
      updated_by: userId
    });
  }, [tabId, hfInstance, userId]);

  const updateCells = useCallback(async (updates: {row: number, col: number, value: string, format?: any}[], saveHistory = true) => {
    if (!tabId || !hfInstance || updates.length === 0) return;

    const hfSheetName = `Tab_${tabId.replace(/-/g, '_')}`;
    if (!hfInstance.doesSheetExist(hfSheetName)) {
      hfInstance.addSheet(hfSheetName);
    }
    const sheetId = hfInstance.getSheetId(hfSheetName)!;

    setData(prev => {
      const newMap = { ...prev };
      const historyAction: any[] = [];
      
      const dbPayload: any[] = [];

      updates.forEach(({row, col, value: valueOrFormula, format}) => {
        const isFormula = valueOrFormula.startsWith('=');
        const value = isFormula ? "" : valueOrFormula;
        const formula = isFormula ? valueOrFormula : "";

        const existing = prev[`${row},${col}`] || {};
        historyAction.push({
          row, col, 
          prevValue: existing.value || "", prevFormula: existing.formula || "",
          nextValue: value, nextFormula: formula
        });

        newMap[`${row},${col}`] = { ...newMap[`${row},${col}`], row, col, value, formula, format: format || newMap[`${row},${col}`]?.format };
        
        if (formula) {
          hfInstance.setCellContents({ sheet: sheetId, row, col }, [[formula]]);
        } else {
          hfInstance.setCellContents({ sheet: sheetId, row, col }, [[value]]);
        }

        dbPayload.push({
          tab_id: tabId,
          row_index: row,
          col_index: col,
          value,
          formula,
          format: format || newMap[`${row},${col}`]?.format,
          updated_by: userId
        });
      });

      if (saveHistory) {
        pushHistory(historyAction);
      }

      updateEvaluations(newMap, sheetId);

      // Async DB Sync
      supabase.from('sheet_cells').upsert(dbPayload).then();

      return newMap;
    });
  }, [tabId, hfInstance, userId]);

  return {
    data,
    evaluations,
    updateCell,
    updateCells,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0
  };
}

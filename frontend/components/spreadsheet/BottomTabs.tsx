"use client";

import React, { useState } from 'react';
import { Plus, Menu, ChevronDown, Check } from 'lucide-react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Tab {
  id: string;
  title: string;
  color?: string;
  index: number;
}

interface BottomTabsProps {
  tabs: Tab[];
  onAddTab: () => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onDeleteTab: (id: string) => void;
  onSetColor: (id: string, color: string | null) => void;
}

const PRESET_COLORS = ['#ff4d4f', '#ff7a45', '#ffa940', '#fadb14', '#a0d911', '#52c41a', '#13c2c2', '#1890ff', '#2f54eb', '#722ed1', '#eb2f96'];

export default function BottomTabs({ tabs, onAddTab, onRenameTab, onDeleteTab, onSetColor }: BottomTabsProps) {
  const { activeTabId, setActiveTabId } = useSpreadsheetStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleDoubleClick = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditValue(tab.title);
  };

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim() && editValue !== tabs.find(t => t.id === id)?.title) {
      onRenameTab(id, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div className="h-10 bg-surface/50 backdrop-blur-md border-t border-border flex items-center px-2 select-none relative z-10">
      <button 
        onClick={onAddTab}
        className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors mr-2"
        title="Add Sheet"
      >
        <Plus className="w-4 h-4" />
      </button>

      <button className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors mr-2">
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <DropdownMenu.Root key={tab.id}>
                <div 
                  className={cn(
                    "group relative min-w-[100px] h-8 flex items-center px-4 rounded-t-md cursor-pointer transition-colors border-b-2",
                    isActive ? "bg-background text-foreground" : "hover:bg-muted/50 text-muted-foreground border-transparent",
                  )}
                  style={{ borderBottomColor: isActive ? (tab.color || 'var(--primary)') : (tab.color || 'transparent') }}
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => handleDoubleClick(tab)}
                >
                  {editingTabId === tab.id ? (
                    <input
                      autoFocus
                      className="bg-transparent border-none outline-none w-full text-sm font-medium"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(tab.id);
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                    />
                  ) : (
                    <>
                      <span className="text-sm font-medium truncate flex-1">{tab.title}</span>
                      <DropdownMenu.Trigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted-foreground/20 ml-2">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenu.Trigger>
                    </>
                  )}
                </div>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[180px] bg-popover text-popover-foreground rounded-xl shadow-lg border border-border p-1 z-50 animate-in fade-in-80 zoom-in-95" align="start">
                    <DropdownMenu.Item className="text-sm px-3 py-1.5 outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md" onClick={() => handleDoubleClick(tab)}>
                      Rename
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="text-sm px-3 py-1.5 outline-none hover:bg-destructive hover:text-destructive-foreground cursor-pointer rounded-md text-red-500" onClick={() => {
                        if (tabs.length > 1) onDeleteTab(tab.id);
                    }} disabled={tabs.length <= 1}>
                      Delete
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                    <DropdownMenu.Label className="text-xs font-semibold px-3 py-1.5 text-muted-foreground">Tab Color</DropdownMenu.Label>
                    <div className="flex flex-wrap gap-1 px-3 py-1.5 max-w-[180px]">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform flex items-center justify-center"
                          style={{ backgroundColor: color }}
                          onClick={() => onSetColor(tab.id, color)}
                        >
                          {tab.color === color && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                        </button>
                      ))}
                      <button
                        className="w-5 h-5 rounded-full border border-border/50 hover:bg-muted flex items-center justify-center bg-transparent"
                        onClick={() => onSetColor(tab.id, null)}
                        title="Reset Color"
                      >
                         <div className="w-full h-px bg-red-500 rotate-45" />
                      </button>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            );
          })}
        </div>
      </div>
    </div>
  );
}

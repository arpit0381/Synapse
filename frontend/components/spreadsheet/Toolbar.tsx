"use client";

import React from 'react';
import { useSpreadsheetStore, CellFormat } from '@/store/spreadsheetStore';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight,
  ChevronDown, PaintBucket, Type,
  Undo2, Redo2, Printer, Percent, DollarSign
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  onApplyFormat?: (format: Partial<CellFormat>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function Toolbar({ onApplyFormat, onUndo, onRedo, canUndo = false, canRedo = false }: ToolbarProps) {
  const { currentFormat, updateCurrentFormat } = useSpreadsheetStore();

  const applyFormat = (format: Partial<CellFormat>) => {
    updateCurrentFormat(format);
    if (onApplyFormat) onApplyFormat(format);
  };

  const toggleFormat = (key: keyof CellFormat) => {
    applyFormat({ [key]: !currentFormat[key] });
  };

  const Button = ({ icon: Icon, active, onClick, disabled = false }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center",
        active ? "bg-accent/20 text-accent hover:bg-accent/30" : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

  const FONTS = ['Inter', 'Arial', 'Times New Roman', 'Courier New', 'Georgia'];
  const SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 36];
  const COLORS = ['#000000', '#ffffff', '#ff4d4f', '#52c41a', '#1890ff', '#faad14'];

  return (
    <div className="h-10 bg-surface/50 backdrop-blur-md border-b border-border flex items-center px-2 gap-1 overflow-x-auto no-scrollbar relative z-20">
      <Button icon={Undo2} disabled={!canUndo} onClick={onUndo} />
      <Button icon={Redo2} disabled={!canRedo} onClick={onRedo} />
      <Button icon={Printer} disabled />
      
      <Divider />
      
      <Button icon={DollarSign} active={currentFormat.numberFormat === 'currency'} onClick={() => applyFormat({ numberFormat: currentFormat.numberFormat === 'currency' ? 'none' : 'currency' })} />
      <Button icon={Percent} active={currentFormat.numberFormat === 'percent'} onClick={() => applyFormat({ numberFormat: currentFormat.numberFormat === 'percent' ? 'none' : 'percent' })} />
      <button className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 h-7 hover:bg-muted rounded-md" onClick={() => {}}>
        .00
      </button>
      <button className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 h-7 hover:bg-muted rounded-md" onClick={() => {}}>
        .0
      </button>
      
      <Divider />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex items-center gap-1 px-2 h-7 hover:bg-muted rounded-md text-sm font-medium text-foreground transition-colors border border-transparent hover:border-border outline-none">
          <span className="truncate w-20 text-left">{currentFormat.fontFamily?.split(',')[0]}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-popover border border-border rounded-xl shadow-lg p-1 z-50">
            {FONTS.map(f => (
              <DropdownMenu.Item 
                key={f} 
                onClick={() => applyFormat({ fontFamily: f })}
                className="text-sm px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer outline-none"
                style={{ fontFamily: f }}
              >
                {f}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Divider />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex items-center gap-1 px-2 h-7 hover:bg-muted rounded-md text-sm font-medium text-foreground transition-colors border border-transparent hover:border-border outline-none">
          <span className="w-4 text-center">{currentFormat.fontSize}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-popover border border-border rounded-xl shadow-lg p-1 z-50 h-48 overflow-y-auto">
            {SIZES.map(s => (
              <DropdownMenu.Item 
                key={s} 
                onClick={() => applyFormat({ fontSize: s })}
                className="text-sm px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer outline-none text-center"
              >
                {s}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Divider />

      <Button icon={Bold} active={currentFormat.bold} onClick={() => toggleFormat('bold')} />
      <Button icon={Italic} active={currentFormat.italic} onClick={() => toggleFormat('italic')} />
      <Button icon={Strikethrough} active={currentFormat.strikethrough} onClick={() => toggleFormat('strikethrough')} />
      
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center flex-col gap-[2px] outline-none">
            <Type className="w-4 h-4 text-muted-foreground" />
            <div className="w-3 h-1" style={{ backgroundColor: currentFormat.color }} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-popover border border-border rounded-xl shadow-lg p-2 z-50 grid grid-cols-6 gap-1 w-48">
            {COLORS.map(c => (
              <DropdownMenu.Item 
                key={c} 
                onClick={() => applyFormat({ color: c })}
                className="w-6 h-6 rounded-full border border-border/50 cursor-pointer outline-none hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      
      <Divider />
      
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center flex-col gap-[2px] outline-none">
            <PaintBucket className="w-4 h-4 text-muted-foreground" />
            <div className="w-3 h-1" style={{ backgroundColor: currentFormat.bgColor || 'transparent' }} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-popover border border-border rounded-xl shadow-lg p-2 z-50 grid grid-cols-6 gap-1 w-48">
             <DropdownMenu.Item 
                onClick={() => applyFormat({ bgColor: '#ffffff' })}
                className="col-span-6 text-xs text-center border-b border-border pb-2 mb-1 cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
              >
                Reset Fill
              </DropdownMenu.Item>
            {COLORS.map(c => (
              <DropdownMenu.Item 
                key={c} 
                onClick={() => applyFormat({ bgColor: c })}
                className="w-6 h-6 rounded-full border border-border/50 cursor-pointer outline-none hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Divider />

      <Button icon={AlignLeft} active={currentFormat.textAlign === 'left' || !currentFormat.textAlign} onClick={() => applyFormat({ textAlign: 'left' })} />
      <Button icon={AlignCenter} active={currentFormat.textAlign === 'center'} onClick={() => applyFormat({ textAlign: 'center' })} />
      <Button icon={AlignRight} active={currentFormat.textAlign === 'right'} onClick={() => applyFormat({ textAlign: 'right' })} />

    </div>
  );
}

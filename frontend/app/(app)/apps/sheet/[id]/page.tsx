"use client";

import { useAppStore } from "@/store/appStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2, MoreVertical, Search, History, Grid3X3, ChevronRight } from "lucide-react";
import SpreadsheetEngine from "@/components/spreadsheet/SpreadsheetEngine";
import { toast } from "sonner";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const MenuDropdown = ({ trigger, items }: { trigger: string, items: { label?: string, divider?: boolean, action?: () => void }[] }) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger className="hover:bg-muted px-2 py-1 rounded cursor-pointer outline-none transition-colors">
      {trigger}
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="bg-popover border border-border rounded-xl shadow-lg py-1.5 w-56 z-50 animate-in fade-in zoom-in-95 duration-100" align="start" sideOffset={5}>
        {items.map((item, idx) => item.divider ? (
          <DropdownMenu.Separator key={idx} className="h-px bg-border my-1.5" />
        ) : (
          <DropdownMenu.Item 
            key={idx} 
            onClick={item.action}
            className="text-[13px] px-4 py-1.5 text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer outline-none transition-colors flex items-center justify-between"
          >
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export default function SheetPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const res = await fetch(`/api/apps/sheets/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      
      if (data.sheet) {
        setSheet(data.sheet);
      } else {
        toast.error("Spreadsheet not found");
        router.push("/apps");
      }
    } catch (error) {
      toast.error("Failed to load spreadsheet");
      router.push("/apps");
    } finally {
      setLoading(false);
    }
  };

  const updateTitle = async (title: string) => {
    setSheet({ ...sheet, title });
    try {
      await fetch(`/api/apps/sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (error) {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold animate-pulse">Initializing Spreadsheet Engine...</p>
        </div>
      </div>
    );
  }

  if (!sheet) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Premium Glass Header */}
      <div className="h-14 border-b border-border flex items-center px-4 bg-surface/80 backdrop-blur-md z-20 gap-4">
        <button 
          onClick={() => router.push("/apps")}
          className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-accent" />
            <input 
              type="text" 
              value={sheet.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-base font-medium text-foreground px-1 py-0.5 rounded hover:bg-muted/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 px-6 -mt-1 text-[13px] font-medium text-muted-foreground">
            <MenuDropdown 
              trigger="File" 
              items={[{ label: "New Spreadsheet" }, { label: "Make a copy" }, { divider: true }, { label: "Download as .xlsx" }, { label: "Print" }]} 
            />
            <MenuDropdown 
              trigger="Edit" 
              items={[{ label: "Undo (Ctrl+Z)" }, { label: "Redo (Ctrl+Y)" }, { divider: true }, { label: "Cut" }, { label: "Copy" }, { label: "Paste" }]} 
            />
            <MenuDropdown 
              trigger="View" 
              items={[{ label: "Show formula bar" }, { label: "Show gridlines" }, { divider: true }, { label: "Zoom 100%" }]} 
            />
            <MenuDropdown 
              trigger="Insert" 
              items={[{ label: "Row above" }, { label: "Row below" }, { label: "Column left" }, { label: "Column right" }, { divider: true }, { label: "Chart" }]} 
            />
            <MenuDropdown 
              trigger="Format" 
              items={[{ label: "Theme" }, { label: "Number" }, { label: "Text" }, { label: "Alignment" }, { divider: true }, { label: "Clear formatting" }]} 
            />
            <MenuDropdown 
              trigger="Data" 
              items={[{ label: "Sort sheet" }, { label: "Create a filter" }, { label: "Data validation" }]} 
            />
            <MenuDropdown 
              trigger="Tools" 
              items={[{ label: "Create a form" }, { label: "Spelling" }, { label: "Macros" }]} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors" title="Version history">
            <History className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full font-bold text-sm hover:bg-accent/20 transition-all">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center ml-2 overflow-hidden">
             {sheet.creator?.avatar_url ? (
               <img src={sheet.creator.avatar_url} alt="" className="w-full h-full object-cover" />
             ) : (
               <span className="text-xs font-bold">{sheet.creator?.full_name?.charAt(0) || "U"}</span>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <SpreadsheetEngine sheetId={id as string} />
      </div>
    </div>
  );
}

"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { 
  Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, 
  Code, Sparkles, Share2, Download, Save, Users, Wand2
} from "lucide-react";
import { useYjsProvider } from "../../lib/yjs-provider";
import { useAppStore } from "../../store/appStore";
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface DocumentEditorProps {
  docId: string;
  initialContent?: string;
  onSave?: (content: string) => void;
}

const MenuBar = ({ editor, onAISuggest }: { editor: any; onAISuggest: () => void }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-surface border-b border-border sticky top-0 z-10 rounded-t-xl overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("bold") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("italic") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("heading", { level: 1 }) ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("heading", { level: 2 }) ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-border mr-1">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("bulletList") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("orderedList") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("blockquote") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn("p-2 rounded-lg transition-colors", editor.isActive("codeBlock") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted")}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={onAISuggest}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 font-bold text-xs transition-all border border-accent/20"
      >
        <Wand2 className="w-3.5 h-3.5" />
        AI Assist
      </button>
    </div>
  );
};

function DocumentEditorInner({ docId, initialContent, onSave, yjs, user }: DocumentEditorProps & { yjs: any, user: any }) {
  const doc = yjs.doc;
  const updateCursor = yjs.updateCursor;
  
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write something brilliant... Type '/' for commands",
      }),
      Collaboration.configure({
        document: doc,
        field: "content",
      }),
      // CollaborationCursor temporarily disabled to isolate the error
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8 text-foreground",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          // Future: Trigger slash command menu
          return false;
        }
        return false;
      }
    },
  });

  const handleAISuggest = async () => {
    if (!editor) return;
    const selection = editor.state.selection;
    const text = editor.state.doc.textBetween(selection.from, selection.to, " ");
    
    if (!text.trim()) {
      toast.error("Please select some text for AI to improve.");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Improve this document text: ${text}`,
          context: "You are an expert editor for a productivity app called Synapse Lite."
        }),
      });
      const data = await response.json();
      if (data.text) {
        editor.chain().focus().insertContent(data.text).run();
        toast.success("AI suggestion applied!");
      }
    } catch (error) {
      toast.error("AI failed to generate suggestion.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-4 h-full">
      <div className="border border-border rounded-2xl bg-background shadow-2xl h-full flex flex-col overflow-hidden transition-all duration-300 hover:border-accent/30">
        <MenuBar editor={editor} onAISuggest={handleAISuggest} />
        
        <div className="flex-1 overflow-y-auto relative bg-surface/30">
          {isAiLoading && (
            <div className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 bg-surface p-6 rounded-2xl border border-border shadow-xl">
                <Sparkles className="w-8 h-8 text-accent animate-pulse" />
                <span className="text-sm font-bold text-accent">AI is writing...</span>
              </div>
            </div>
          )}
          {editor ? (
            <EditorContent editor={editor} className="h-full" />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="h-10 border-t border-border px-4 flex items-center justify-between bg-surface/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Collaborative Mode</span>
            <span className="flex items-center gap-1.5"><Save className="w-3 h-3 text-green-500" /> Autosaved</span>
          </div>
          <div>
            Characters: {editor?.storage.characterCount?.characters() || 0}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentEditor(props: DocumentEditorProps) {
  const { user } = useAppStore();
  const yjs = useYjsProvider(props.docId, user?.id || "anonymous");
  
  if (!yjs || !yjs.doc) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <DocumentEditorInner {...props} yjs={yjs} user={user} />;
}

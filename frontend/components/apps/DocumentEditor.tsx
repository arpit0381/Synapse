"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, Code } from "lucide-react";

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-surface border-b border-border sticky top-0 z-10 rounded-t-xl">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("bold") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("italic") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("bulletList") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("orderedList") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("blockquote") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive("codeBlock") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        title="Code Block"
      >
        <Code className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function DocumentEditor({ content, onChange }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing your document...",
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8 text-foreground",
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto w-full p-4 h-full">
      <div className="border border-border rounded-xl bg-background shadow-sm h-full flex flex-col overflow-hidden">
        <MenuBar editor={editor} />
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  );
}

import { Server } from "socket.io";
import * as Y from "yjs";
import { supabaseAdmin } from "./supabase";

/**
 * Sets up Yjs collaboration over Socket.IO.
 * This handles character-level syncing and collaborative cursors.
 */
export function setupYjs(io: Server) {
  // Map of documentId -> Y.Doc
  const docs = new Map<string, Y.Doc>();

  io.on("connection", (socket) => {
    // ── Yjs Collaboration Events ──────────────────────────────────
    
    socket.on("yjs-join", async ({ docId }: { docId: string }) => {
      console.log(`[Yjs] User ${socket.id} joining doc ${docId}`);
      socket.join(`yjs:${docId}`);

      // Initialize doc if not exists
      if (!docs.has(docId)) {
        const doc = new Y.Doc();
        docs.set(docId, doc);

        // Optional: Fetch initial content from Supabase
        const { data: document } = await supabaseAdmin
          .from("documents")
          .select("content")
          .eq("id", docId)
          .single();

        if (document?.content && typeof document.content === "string") {
          // This is a simple implementation. In a real production app, 
          // you would store the Yjs update binary in the DB.
          // For now, we'll assume content is just text for simplicity,
          // but we will upgrade this to binary sync later.
          const text = doc.getText("content");
          text.insert(0, document.content);
        }
      }

      const doc = docs.get(docId)!;

      // Send initial state
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("yjs-update", state);
    });

    socket.on("yjs-update", ({ docId, update }: { docId: string; update: Uint8Array }) => {
      const doc = docs.get(docId);
      if (doc) {
        Y.applyUpdate(doc, update);
        // Broadcast to other users in the room
        socket.to(`yjs:${docId}`).emit("yjs-update", update);

        // Autosave to Supabase (Throttled or on update)
        // Note: For real production, use a more efficient storage for Yjs binaries.
        debouncedSave(docId, doc);
      }
    });

    socket.on("yjs-cursor", ({ docId, cursor }: { docId: string; cursor: any }) => {
      // Broadcast cursor position to others
      socket.to(`yjs:${docId}`).emit("yjs-cursor", { userId: socket.data.userId, cursor });
    });
  });
}

const saveTimeouts = new Map<string, NodeJS.Timeout>();

function debouncedSave(docId: string, doc: Y.Doc) {
  if (saveTimeouts.has(docId)) {
    clearTimeout(saveTimeouts.get(docId)!);
  }

  const timeout = setTimeout(async () => {
    const content = doc.getText("content").toString();
    await supabaseAdmin
      .from("documents")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", docId);
    
    saveTimeouts.delete(docId);
    console.log(`[Yjs] Autosaved doc ${docId}`);
  }, 5000); // Save every 5 seconds of inactivity

  saveTimeouts.set(docId, timeout);
}

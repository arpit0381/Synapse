import { useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useYjsProvider(docId: string, userId: string) {
  const [doc] = useState(() => new Y.Doc());
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      query: { userId },
    });

    setSocket(s);

    s.emit("yjs-join", { docId });

    s.on("yjs-update", (update: Uint8Array) => {
      Y.applyUpdate(doc, new Uint8Array(update));
    });

    doc.on("update", (update) => {
      s.emit("yjs-update", { docId, update });
    });

    return () => {
      s.disconnect();
    };
  }, [docId, userId, doc]);

  const updateCursor = useCallback((cursor: any) => {
    if (socket) {
      socket.emit("yjs-cursor", { docId, cursor });
    }
  }, [socket, docId]);

  return { doc, updateCursor, socket };
}

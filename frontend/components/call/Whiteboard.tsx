"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "@/store/callStore";
import { getSocket } from "@/lib/socket";
import { Pencil, Eraser, Trash2, Download, Square, Circle as CircleIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Point { x: number; y: number; }

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const store = useCallStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Responsive canvas
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = "round";
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          contextRef.current = ctx;
        }
      }
    };

    window.addEventListener("resize", resize);
    resize();

    // Socket listeners for remote drawing
    const socket = getSocket();
    socket.on("wb-draw", (data: any) => {
      const { x, y, prevX, prevY, color: remoteColor, width, isEraser } = data;
      drawRemote(x, y, prevX, prevY, remoteColor, width, isEraser);
    });

    socket.on("wb-clear", () => clearLocal());

    return () => {
      window.removeEventListener("resize", resize);
      socket.off("wb-draw");
      socket.off("wb-clear");
    };
  }, []);

  const drawRemote = (x: number, y: number, prevX: number, prevY: number, color: string, width: number, isEraser: boolean) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(x, y);
    lastPoint.current = { x, y };
  };

  const lastPoint = useRef<Point>({ x: 0, y: 0 });

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();

    // Broadcast
    getSocket().emit("wb-draw", {
      roomId: store.callRoomId,
      x, y,
      prevX: lastPoint.current.x,
      prevY: lastPoint.current.y,
      color,
      width: lineWidth,
      isEraser: tool === "eraser"
    });

    lastPoint.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    contextRef.current?.closePath();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearLocal = () => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleClear = () => {
    clearLocal();
    getSocket().emit("wb-clear", { roomId: store.callRoomId });
  };

  const download = () => {
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvasRef.current?.toDataURL() || "";
    link.click();
  };

  return (
    <div className="relative w-full h-full bg-[#1e1f22] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="cursor-crosshair w-full h-full"
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 p-2 bg-[#111214]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
        <ToolBtn active={tool === "pencil"} onClick={() => setTool("pencil")} icon={Pencil} label="Pencil" />
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} icon={Eraser} label="Eraser" />
        <div className="w-full h-px bg-white/10 my-1" />
        <ToolBtn onClick={handleClear} icon={Trash2} label="Clear All" danger />
        <ToolBtn onClick={download} icon={Download} label="Export" />
      </div>

      {/* Color & Size Picker */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 p-3 bg-[#111214]/80 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
        <div className="flex gap-2">
          {["#ffffff", "#f23f42", "#23a55a", "#5865f2", "#f0b232", "#eb459e"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#111214]" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-white/10" />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="w-24 accent-accent"
        />
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon: Icon, label, danger }: any) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-xl transition-all ${
        active 
          ? "bg-accent text-white shadow-lg shadow-accent/20" 
          : danger 
            ? "text-red-400 hover:bg-red-500/10" 
            : "text-[#b5bac1] hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

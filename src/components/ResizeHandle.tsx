"use client";

import { useEffect, useRef, useState } from "react";

export function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const [dragging, setDragging] = useState(false);
  const lastXRef = useRef(0);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    lastXRef.current = e.clientX;
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onResize(delta);
    }
    function handleMouseUp() {
      setDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      className={`w-1 shrink-0 cursor-col-resize ${dragging ? "bg-accent" : "bg-line hover:bg-accent/50"}`}
    />
  );
}

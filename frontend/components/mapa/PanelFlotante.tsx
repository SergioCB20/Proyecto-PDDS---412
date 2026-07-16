'use client';

import { X } from 'lucide-react';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import type { ReactNode } from 'react';

interface PanelFlotanteProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function PanelFlotante({
  title,
  onClose,
  children,
  className = '',
}: PanelFlotanteProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPos({ left: rect.left, top: rect.top });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.left,
      y: e.clientY - pos.top,
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const handleMouseMove = (e: MouseEvent) => {
      setPos({
        left: e.clientX - dragOffset.current.x,
        top: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      ref={panelRef}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 1001,
      }}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden ${className}`}
    >
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pointer-events-auto">{children}</div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';

interface PlayAreaProps {
  children: ReactNode;
  className?: string;
}

interface PanOffset {
  x: number;
  y: number;
  isDragging?: boolean;
  lastMouseX?: number;
  lastMouseY?: number;
}

export const PlayArea: React.FC<PlayAreaProps> = ({ children, className = 'play-area' }) => {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Center content on initial load
  useEffect(() => {
    if (!isInitialized && viewportRef.current) {
      const viewport = viewportRef.current;
      // Center the viewport to the middle of the large container
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
      setIsInitialized(true);
    }
  }, [isInitialized, children]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { // Only zoom when Ctrl/Cmd is held
      e.preventDefault();
      e.stopPropagation();
      
      const viewport = viewportRef.current;
      if (!viewport) return;
      
      // Get cursor position relative to viewport
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      
      // Get viewport center
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;
      
      // Calculate offset from center to cursor
      const offsetX = cursorX - centerX;
      const offsetY = cursorY - centerY;
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
      const zoomRatio = newZoom / zoom;
      
      // Adjust pan to zoom toward cursor
      setPanOffset(prev => ({
        ...prev,
        x: prev.x - (offsetX * (zoomRatio - 1)),
        y: prev.y - (offsetY * (zoomRatio - 1))
      }));
      
      setZoom(newZoom);
    }
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, .card, .zone')) {
      return; // Prevent dragging on interactive elements
    }
    
    // Prevent default to avoid text selection
    e.preventDefault();
    
    setPanOffset((prev) => ({
      ...prev,
      isDragging: true,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY,
    }));
  };

  const handleMouseMove = (e: MouseEvent) => {
    setPanOffset((prev) => {
      if (!prev.isDragging) return prev;
      
      const deltaX = e.clientX - prev.lastMouseX!;
      const deltaY = e.clientY - prev.lastMouseY!;
      
      return {
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY,
      };
    });
  };

  const handleMouseUp = () => {
    setPanOffset((prev) => ({ ...prev, isDragging: false }));
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const wheelHandler = handleWheel as EventListener;
    if (viewport) {
      viewport.addEventListener('wheel', wheelHandler, { passive: false });
      return () => viewport.removeEventListener('wheel', wheelHandler);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (panOffset.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [panOffset.isDragging]);

  return (
    <>
      {/* Zoom controls */}
      <div className="zoom-controls" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <button onClick={handleZoomOut} style={{
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}>
          −
        </button>
        <span style={{ color: 'white', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} style={{
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}>
          +
        </button>
        <button onClick={handleResetZoom} style={{
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}>
          Reset
        </button>
      </div>

      {/* Viewport container with proper overflow handling */}
      <div
        ref={viewportRef}
        className="play-area-viewport"
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          cursor: panOffset.isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Large container to provide scrollable area in all directions */}
        <div
          style={{
            width: '400vw', // Fixed large size instead of dynamic
            height: '400vh', // Fixed large size instead of dynamic
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Content container */}
          <div
            className={className}
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: panOffset.isDragging ? 'none' : 'transform 0.2s ease',
              position: 'relative'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayArea;

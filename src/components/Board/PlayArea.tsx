import React, { useState, useEffect, useCallback, ReactNode, useRef, useImperativeHandle } from 'react';
import { ViewState } from 'components/Game/drag';
import './PlayArea.css';

export interface PlayAreaHandle {
  /**
   * Screen coordinates to canvas coordinates. Inverts pan, zoom and rotation
   * analytically — the canvas is the only transformed ancestor.
   */
  toCanvas: (clientX: number, clientY: number) => { x: number; y: number };
}

interface PlayAreaProps {
  children: ReactNode;
  className?: string;
  /** Degrees the canvas is rotated by, to bring a seat to the bottom. */
  rotation?: number;
  /** Written on every change so the drag layer can convert pointer deltas. */
  view?: React.MutableRefObject<ViewState>;
  /** Rendered outside the transform: never pans, zooms or rotates. */
  overlay?: ReactNode;
  /** Table footprint in canvas px, so the view can be fitted to it. */
  content?: { width: number; height: number };
}

/** Pixels per line, for wheel events that report deltas in lines. */
const LINE_HEIGHT = 16;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 3;
const FIT_MARGIN = 0.92;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

export const PlayArea = React.forwardRef<PlayAreaHandle, PlayAreaProps>(
  ({ children, className = 'play-area', rotation = 0, view, overlay, content }, ref) => {
    const [zoom, setZoom] = useState(1);
    const viewportRef = useRef<HTMLDivElement>(null);
    const panRef = useRef<HTMLDivElement>(null);

    // Pan lives in a ref, not state: a re-render per pointermove would redraw
    // every seat and card on the canvas and makes dragging crawl.
    const pan = useRef({ x: 0, y: 0 });
    const panning = useRef<{ id: number; x: number; y: number } | null>(null);

    /**
     * Pan is its own layer and its own transform property, deliberately: the
     * canvas below animates its rotation, and a shared `transform` would put
     * every pan frame through that same 250 ms tween — the canvas would lag the
     * cursor, and any rect measured mid-tween would be wrong.
     */
    const paintPan = useCallback(() => {
      const el = panRef.current;
      if (el) el.style.translate = `${pan.current.x}px ${pan.current.y}px`;
    }, []);

    useEffect(() => { paintPan(); }, [paintPan]);
    useEffect(() => { if (view) view.current = { zoom, rotation }; }, [zoom, rotation, view]);

    useImperativeHandle(ref, () => ({
      toCanvas: (clientX: number, clientY: number) => {
        const el = panRef.current;
        if (!el) return { x: clientX, y: clientY };
        // The pan layer is a zero-size box centred in the viewport and carries no
        // transition, so its rect is the canvas origin exactly — never a value
        // caught halfway through an animation.
        const r = el.getBoundingClientRect();
        const dx = (clientX - (r.left + r.width / 2)) / zoom;
        const dy = (clientY - (r.top + r.height / 2)) / zoom;
        const rad = (-rotation * Math.PI) / 180;
        return {
          x: dx * Math.cos(rad) - dy * Math.sin(rad),
          y: dx * Math.sin(rad) + dy * Math.cos(rad),
        };
      },
    }), [zoom, rotation]);

    const handleZoomIn = () => setZoom((z) => clampZoom(z + 0.1));
    const handleZoomOut = () => setZoom((z) => clampZoom(z - 0.1));
    const handleReset = () => { pan.current = { x: 0, y: 0 }; paintPan(); setZoom(1); };

    /**
     * Frame the whole table. Rotation is a multiple of 90 degrees, so a quarter
     * turn simply swaps which table axis is measured against which viewport axis.
     */
    const fitToContent = useCallback(() => {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (!vp || !content || !content.width || !content.height) return;
      const turned = Math.abs(Math.round(rotation / 90)) % 2 === 1;
      const w = turned ? content.height : content.width;
      const h = turned ? content.width : content.height;
      pan.current = { x: 0, y: 0 };
      paintPan();
      setZoom(clampZoom(Math.min(vp.width / w, vp.height / h) * FIT_MARGIN));
    }, [content, rotation, paintPan]);

    // Frame the table on load, and whenever a different table replaces it —
    // at real scale the default 100% view starts somewhere inside the tabletop.
    const fitRef = useRef(fitToContent);
    fitRef.current = fitToContent;
    useEffect(() => { fitRef.current(); }, [content?.width, content?.height]);

    /**
     * Ctrl/Cmd + wheel zooms; a plain wheel pans. Both axes are honoured, since a
     * trackpad reports deltaX for a two-finger sideways swipe. The wheel never
     * scrolls the page here — the play area is the thing being moved.
     */
    const handleWheel = useCallback((e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoom((z) => clampZoom(z + (e.deltaY > 0 ? -0.1 : 0.1)));
        return;
      }
      // Firefox reports lines rather than pixels; a page delta is rarer still.
      const step = e.deltaMode === 1 ? LINE_HEIGHT : e.deltaMode === 2 ? window.innerHeight : 1;
      pan.current = {
        x: pan.current.x - e.deltaX * step,
        y: pan.current.y - e.deltaY * step,
      };
      paintPan();
    }, [paintPan]);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const handler = handleWheel as EventListener;
      viewport.addEventListener('wheel', handler, { passive: false });
      return () => viewport.removeEventListener('wheel', handler);
    }, [handleWheel]);

    // A card captures its own pointer on grab, so a card drag never reaches this.
    const onPointerDown = (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, .card-container, .zone-drop')) return;
      panning.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      // A class, not state: the cursor is the only thing that changes, and a
      // re-render here would redraw the whole canvas twice per pan.
      viewportRef.current?.classList.add('panning');
      viewportRef.current?.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
      const p = panning.current;
      if (!p || p.id !== e.pointerId) return;
      pan.current = { x: pan.current.x + (e.clientX - p.x), y: pan.current.y + (e.clientY - p.y) };
      p.x = e.clientX; p.y = e.clientY;
      paintPan(); // straight to the DOM, no re-render
    };
    const endPan = (e: React.PointerEvent) => {
      if (panning.current?.id !== e.pointerId) return;
      panning.current = null;
      viewportRef.current?.classList.remove('panning');
    };

    return (
      <>
        <div className="zoom-controls">
          <button onClick={handleZoomOut} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} aria-label="Zoom in">+</button>
          {content ? <button onClick={fitToContent}>Fit</button> : null}
          <button onClick={handleReset}>Reset</button>
        </div>

        {overlay}

        <div
          ref={viewportRef}
          className="ct-root play-area-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div ref={panRef} className="play-pan">
            <div
              className={`${className} play-canvas`}
              style={{ scale: String(zoom), rotate: `${rotation}deg` }}
            >
              {children}
            </div>
          </div>
        </div>
      </>
    );
  }
);

PlayArea.displayName = 'PlayArea';
export default PlayArea;

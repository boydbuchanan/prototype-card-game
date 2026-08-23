import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

export interface DropTarget {
  /** Zone id, or null for a free drop on the canvas. */
  zone: string | null;
  /** Insert position within a Row/Column zone. Omitted means append. */
  index?: number;
  /** Screen coordinates of the card's CENTRE at release. */
  clientX: number;
  clientY: number;
}

/** Live canvas view state, written by PlayArea. */
export interface ViewState {
  zoom: number;
  rotation: number;
}

interface DragSession {
  cardId: string;
  /** The real card, left in place and dimmed while the ghost follows the pointer. */
  el: HTMLElement;
  ghost: HTMLElement | null;
  /** Pointer offset from the card's centre at grab time, in screen space. */
  offX: number;
  offY: number;
  w: number;
  h: number;
}

interface DragContextValue {
  registerZone: (id: string, el: HTMLElement | null) => void;
  beginDrag: (e: React.PointerEvent, cardId: string) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

/** Movement in px before a press becomes a drag, so a plain click still rotates. */
const DRAG_THRESHOLD = 4;

/**
 * Degrees of rotation applied to a card by its ancestors (canvas + seat).
 * The seat publishes its angle as `data-angle`; parsing the rendered transform
 * string instead would break the moment its format changed.
 */
function ancestorRotation(el: HTMLElement, view: ViewState): { rot: number; scale: number } {
  if (!el.closest(".play-canvas")) return { rot: 0, scale: 1 }; // tray is screen-fixed
  const seat = el.closest<HTMLElement>(".seat");
  return { rot: view.rotation + (Number(seat?.dataset.angle) || 0), scale: view.zoom };
}

export const DragProvider: React.FC<{
  onDrop: (cardId: string, target: DropTarget) => void;
  /** A press that never became a drag. The caller decides what the modifiers mean. */
  onClickCard: (cardId: string, mods: { ctrlKey: boolean; metaKey: boolean }) => void;
  view: React.RefObject<ViewState>;
  children: React.ReactNode;
}> = ({ onDrop, onClickCard, view, children }) => {
  const zones = useRef(new Map<string, HTMLElement>());
  const session = useRef<DragSession | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const armed = useRef(false);

  const registerZone = useCallback((id: string, el: HTMLElement | null) => {
    if (el) zones.current.set(id, el);
    else zones.current.delete(id);
  }, []);

  /**
   * Which zone is under the point. Rects are read at release, since a zone
   * resizes as cards leave it. Smallest containing rect wins, so a zone nested
   * inside another still takes the drop.
   *
   * `exclude` is the card being dragged. It is still in the DOM at its old
   * position, and the caller drops it from the list before inserting at the
   * returned index, so counting it here would land it one slot too far.
   */
  const hitTest = useCallback((
    x: number,
    y: number,
    exclude?: HTMLElement
  ): { zone: string | null; index?: number } => {
    let bestId: string | null = null;
    let bestArea = Infinity;
    zones.current.forEach((el, id) => {
      if (!el.isConnected) return;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const area = r.width * r.height;
      if (area < bestArea) { bestArea = area; bestId = id; }
    });
    if (bestId === null) return { zone: null };

    const el = zones.current.get(bestId)!;
    // A stack has one visible card and the last entry is the top, so a drop
    // always lands on top — never underneath what is already there.
    if (el.dataset.stack === "true") return { zone: bestId };

    const cards = Array.from(el.querySelectorAll<HTMLElement>(".card-container"))
      .filter((c) => c !== exclude);
    const vertical = el.dataset.axis === "column";
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const mid = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
      if ((vertical ? y : x) < mid) { index = i; break; }
    }
    return { zone: bestId, index };
  }, []);

  const placeGhost = (s: DragSession, x: number, y: number) => {
    if (!s.ghost) return;
    s.ghost.style.transform =
      `translate(${x - s.offX - s.w / 2}px, ${y - s.offY - s.h / 2}px) ` +
      s.ghost.dataset.post;
  };

  const teardown = (s: DragSession) => {
    s.ghost?.remove();
    s.el.classList.remove("card-dragging");
    document.body.classList.remove("card-drag-active");
  };

  const beginDrag = useCallback((e: React.PointerEvent, cardId: string) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    session.current = {
      cardId, el,
      ghost: null,
      offX: e.clientX - (rect.left + rect.width / 2),
      offY: e.clientY - (rect.top + rect.height / 2),
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
    origin.current = { x: e.clientX, y: e.clientY };
    armed.current = false;
    try { el.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = session.current;
      if (!s) return;
      const dx = e.clientX - origin.current.x;
      const dy = e.clientY - origin.current.y;

      if (!armed.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        armed.current = true;

        // The ghost is a plain clone in screen space, so no ancestor transform
        // can skew how it follows the pointer. The real card stays put.
        const v = view.current ?? { zoom: 1, rotation: 0 };
        const { rot, scale } = ancestorRotation(s.el, v);
        const ghost = s.el.cloneNode(true) as HTMLElement;
        ghost.removeAttribute("data-card-id");
        ghost.classList.add("card-ghost");
        ghost.style.width = s.w + "px";
        ghost.style.height = s.h + "px";
        ghost.dataset.post = `scale(${scale}) rotate(${rot}deg)`;
        document.body.appendChild(ghost);
        s.ghost = ghost;

        // Dimming the source card is a DOM class, not React state: a state flip
        // here would re-render every mounted card twice per drag.
        s.el.classList.add("card-dragging");
        document.body.classList.add("card-drag-active");
      }

      placeGhost(s, e.clientX, e.clientY);
    };

    const up = (e: PointerEvent) => {
      const s = session.current;
      if (!s) return;
      const wasDrag = armed.current;
      try { s.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (wasDrag) teardown(s);
      session.current = null;
      armed.current = false;

      if (wasDrag) {
        // Everything is decided at the card's centre — rotation-invariant, unlike
        // a corner, and the same point the drop reports, so the zone choice and
        // the free-drop position can never disagree at a zone edge.
        const cx = e.clientX - s.offX;
        const cy = e.clientY - s.offY;
        onDrop(s.cardId, { ...hitTest(cx, cy, s.el), clientX: cx, clientY: cy });
      } else if (e.button === 0 || e.pointerType !== "mouse") {
        // Pointer capture redirects the click to the capturing element, so the
        // card's own onClick never fires — report it from here instead.
        onClickCard(s.cardId, { ctrlKey: e.ctrlKey, metaKey: e.metaKey });
      }
    };

    const cancel = () => {
      const s = session.current;
      if (!s) return;
      if (armed.current) teardown(s);
      session.current = null;
      armed.current = false;
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }, [hitTest, onDrop, onClickCard, view]);

  // Both entries are stable, so the value never changes identity and a drag
  // costs zero React renders from start to finish.
  const value = useMemo(() => ({ registerZone, beginDrag }), [registerZone, beginDrag]);

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};

export function useDragLayer(): DragContextValue {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDragLayer must be used inside a DragProvider");
  return ctx;
}

/** Registers a zone element as a drop target for as long as it is mounted. */
export function useZoneTarget(id: string) {
  const { registerZone } = useDragLayer();
  return useCallback((el: HTMLDivElement | null) => {
    registerZone(id, el);
  }, [id, registerZone]);
}

export default DragContext;

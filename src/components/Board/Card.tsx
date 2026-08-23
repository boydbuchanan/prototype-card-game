import React from "react";
import { useDragLayer } from "components/Game/drag";
import "./Card.css";
import CardTemplateContent from "components/Game/CardTemplate";
import { useTemplates } from "components/Game/TemplateContext";
import { CardData, CardState } from "types";

interface CardProps {
  card: CardData;
  /** Playable state for this card. Rotation and face live here, not in the component. */
  state?: CardState;
  children?: React.ReactNode;
  /** Rotation is expressed as a delta so the board owns the absolute angle. */
  onRotateBy?: (cardId: string, delta: number) => void;
}

/**
 * A card is driven entirely by the pointer: drag to move, left click to turn it
 * one way, right click the other, Ctrl/Cmd + click to flip. Left click and the
 * flip are handled by the drag layer, which owns the pointer during a press.
 */
const Card: React.FC<CardProps> = ({ card, state, children, onRotateBy }) => {
  const templates = useTemplates();
  const template = templates?.templates?.[card.cardType] ?? templates?.templates?.default;

  // Rotation and face are board state, so they survive a move between zones.
  const rotation = state?.rotation ?? 0;
  const isFaceUp = state?.faceUp ?? true;
  const upright = rotation % 180 === 0;

  const { beginDrag } = useDragLayer();

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    // On macOS a Ctrl+click raises this as well as a normal click; that gesture
    // is the flip, so leave it to the click handler rather than also turning.
    if (event.ctrlKey || event.metaKey) return;
    onRotateBy?.(String(card.id), 90);
  };

  return (
    <div
      className={`card-container ${upright ? "" : "card-sideways"}`}
      data-card-id={card.id}
      data-rotation={rotation}
      onPointerDown={(e) => beginDrag(e, String(card.id))}
      onContextMenu={handleContextMenu}
    >
      <div
        className={`card ${isFaceUp ? "" : "card-back"}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {children}
        {isFaceUp && template && templates ? (
          <CardTemplateContent card={card} template={template} templates={templates} />
        ) : (
          <div className="card-back-content"></div>
        )}
      </div>
    </div>
  );
};

// Every prop is stable except `state`, which the board replaces only for the card
// that actually changed — so one rotation re-renders one card, not the whole table.
export default React.memo(Card);

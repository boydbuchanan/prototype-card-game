import React from "react";
import { useDragLayer } from "components/Game/drag";
import "./Card.css";
import CardTemplateContent from "components/Game/CardTemplate";
import { useTemplates } from "components/Game/TemplateContext";
import { Rotation } from "enums";
import { CardData, CardState } from "types";

interface CardProps {
  card: CardData;
  /** Playable state for this card. Rotation and face live here, not in the component. */
  state?: CardState;
  children?: React.ReactNode;
  /** Rotation is expressed as a delta so the board owns the absolute angle. */
  onRotateBy?: (cardId: string, delta: number) => void;
  onFlip?: (cardId: string, faceUp: boolean) => void;
}

/** Absolute orientations the toolbar can ask for. */
const TARGET_ANGLE: Record<Rotation, number> = {
  [Rotation.Normal]: 0,
  [Rotation.Left]: -90,
  [Rotation.Right]: 90,
  [Rotation.Reverse]: 180,
};

const Card: React.FC<CardProps> = ({ card, state, children, onRotateBy, onFlip }) => {
  const templates = useTemplates();
  const template = templates?.templates?.[card.cardType] ?? templates?.templates?.default;

  // Rotation and face are board state, so they survive a move between zones.
  const rotation = state?.rotation ?? 0;
  const isFaceUp = state?.faceUp ?? true;
  const upright = rotation % 180 === 0;

  const { beginDrag } = useDragLayer();

  const handleFlip = () => onFlip?.(String(card.id), !isFaceUp);

  /** Absolute orientation from the toolbar, taking the shortest way round. */
  const setOrientation = (direction: Rotation) => {
    // Nearest equivalent angle to where the card already is.
    let delta = (TARGET_ANGLE[direction] - rotation) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    onRotateBy?.(String(card.id), delta);
  };

  /**
   * Right click rotates clockwise. Left click rotates counter-clockwise, but it is
   * handled by the drag layer: pointer capture redirects the click event to the
   * capturing element, so a handler here would never fire.
   */
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
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
      {/* Floating toolbar */}
      <div className="card-toolbar">
        <ToolbarButton icon="👁" label="Flip card" onClick={handleFlip} />
        <ToolbarButton icon="▲" label="Upright" onClick={() => setOrientation(Rotation.Normal)} />
        <ToolbarButton icon="◄" label="Turn left" onClick={() => setOrientation(Rotation.Left)} />
        <ToolbarButton icon="►" label="Turn right" onClick={() => setOrientation(Rotation.Right)} />
        <ToolbarButton icon="▼" label="Upside down" onClick={() => setOrientation(Rotation.Reverse)} />
      </div>

      {/* Rotating card content */}
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

const ToolbarButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button className="toolbar-button" onClick={onClick} title={label} aria-label={label}>
    {icon}
  </button>
);

// Every prop is stable except `state`, which the board replaces only for the card
// that actually changed — so one rotation re-renders one card, not the whole table.
export default React.memo(Card);

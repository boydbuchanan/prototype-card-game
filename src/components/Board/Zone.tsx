import React from "react";
import Card from "./Card";
import "./Zone.css";
import { useZoneTarget } from "components/Game/drag";
import { ZoneInfo } from "components/Game/scenario";
import { CardZoneType } from "enums";
import { BoardState, CardData } from "types";

interface ZoneProps {
  zone: ZoneInfo;
  cards: CardData[];
  board: BoardState;
  onRotateBy: (cardId: string, delta: number) => void;
  onFlip: (cardId: string, faceUp: boolean) => void;
}

const CLASS_FOR: Record<CardZoneType, string> = {
  [CardZoneType.Stack]: "stack-zone",
  [CardZoneType.Row]: "row-zone",
  [CardZoneType.Column]: "column-zone",
};

/**
 * A zone imposes order on the cards dropped into it — nothing else. It is a drop
 * target by virtue of registering its element; hit-testing happens in the drag
 * layer, in screen space.
 */
const Zone: React.FC<ZoneProps> = ({ zone, cards, board, onRotateBy, onFlip }) => {
  const dropRef = useZoneTarget(zone.id);
  const zoneType = zone.type ?? CardZoneType.Row;

  // A stack shows only its top card; rows and columns show everything.
  const shown = zoneType === CardZoneType.Stack ? cards.slice(-1) : cards;

  return (
    <div className={`zone-container text-${zone.textPosition}`}>
      <div className="zone-text">{zone.name || zone.id}</div>
      <div
        ref={dropRef}
        className={`zone-drop ${CLASS_FOR[zoneType] ?? "row-zone"}`}
        data-zone={zone.id}
        data-axis={zoneType === CardZoneType.Column ? "column" : "row"}
        data-stack={zoneType === CardZoneType.Stack ? "true" : undefined}
      >
        {shown.map((card) => (
          <Card
            key={card.id}
            card={card}
            state={board[String(card.id)]}
            onRotateBy={onRotateBy}
            onFlip={onFlip}
          />
        ))}
      </div>
    </div>
  );
};

export default Zone;

import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import Card, { CardFace, CardData } from "components/Card";
import Zone from "./Zone";
import "./Zone.css"; // Import the Zone CSS file

interface PlayZoneProps {
  zoneName: string;
  cards: CardData[];
  onZoneDrop: (cardId: string, zoneName: string) => void;
  onCardDrop?: (cardId: string, hoverIndex: number, zoneName: string) => void
  cardDisplayType?: CardFace
}

interface CardPosition {
  x: number;
  y: number;
}

export const PlayZone: React.FC<PlayZoneProps> = ({ 
  zoneName, 
  cards, 
  onZoneDrop,
  onCardDrop,
  cardDisplayType = CardFace.Both, // Default to face up
}) => {
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({});

  const handleCardMove = (cardId: string, newZone: string) => {
    onZoneDrop(cardId, newZone);
  };

  const handleDrop = (cardId: string, x: number, y: number) => {
    setCardPositions((prevPositions) => ({
      ...prevPositions,
      [cardId]: { x, y },
    }));
  };

  const [{ canDrop, isOver, isOverCurrent }, drop] = useDrop(() => ({
    accept: "card",
    drop: (item: { id: string }, monitor) => {
      if (monitor.isOver({ shallow: true })) {
        const offset = monitor.getClientOffset();
        const containerRect = dropRef.current?.getBoundingClientRect();

        if (offset && containerRect) {
          const x = offset.x - containerRect.left; // Calculate x relative to the container
          const y = offset.y - containerRect.top; // Calculate y relative to the container
          handleDrop(item.id, x, y);
        }
        onZoneDrop(item.id, zoneName);
      }
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOverCurrent: monitor.isOver({ shallow: true }),
      isOver: monitor.isOver(),
    }),
  }));

  const dropRef = useRef<HTMLDivElement>(null);

  // Combine the drop ref with the React ref
  React.useEffect(() => {
    if (dropRef.current) {
      drop(dropRef.current);
    }
  }, [drop]);

  const isActive = canDrop && isOver;

  return (
    <Zone zoneName={zoneName} onZoneDrop={handleCardMove}>
      <div
        ref={dropRef} // Use the combined ref
        className={`play-zone ${isActive ? "active" : ""}`}
      >
        {cards && cards.map((card) => {
          const cardPosition = cardPositions[card.id];
          return (
            <div
              key={card.id}
              style={{
                opacity: 1,
                position: "absolute",
                left: cardPosition ? cardPosition.x - 30 : 0,
                top: cardPosition ? cardPosition.y - 60 : 0,
              }}
            >
              <Card
                card={card}
                onCardDrop={onCardDrop}
                zoneName={zoneName}
                cardDisplayType={cardDisplayType} // Assuming you want to display the card face up
              />
            </div>
          );
        })}
      </div>
    </Zone>
  );
};

export default PlayZone;

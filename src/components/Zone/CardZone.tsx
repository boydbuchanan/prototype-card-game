import React, { useRef } from "react";
import Card, { CardFace } from "components/Card";
import Zone from "components/Zone/Zone";
import "components/Zone/Zone.css"; // Import the Zone CSS file

import { CardData } from "components/Card";
import { Position, Rotation } from "enums";

interface CardZoneProps {
  zoneName: string;
  zoneType?: CardZoneType; // Type of the zone (Stack or Bar)
  textPosition?: Position; // Position of the text
  rotate?: Rotation; // Rotation of the text
  text?: string; // Optional text prop for the zone title
  cards: CardData[];
  onZoneDrop: (cardId: string, zoneName: string) => void;
  onCardDrop?: (cardId: string, hoverIndex: number, zoneName: string) => void
  cardDisplayType?: CardFace;
  cardRotation?: Rotation; // Optional rotation prop for the card
}
export enum CardZoneType {
  Stack,
  Bar,
}

const CardZone: React.FC<CardZoneProps> = ({
  zoneName,
  zoneType = CardZoneType.Bar, // Default to Bar zone type
  textPosition = Position.Left,
  rotate = Rotation.Normal,
  text,
  cards,
  onZoneDrop,
  onCardDrop,
  cardDisplayType = CardFace.FaceUp,
  cardRotation = Rotation.Normal, // Default to normal rotation for cards
}) => {
  text = text || zoneName; // Default to zoneName if text is not provided
  const shownCards: CardData[] =
    zoneType === CardZoneType.Stack
      ? cards?.slice(-1) || [] // Show only the top card in stack zone
      : cards || []; // Show all cards in bar zone

  const canScroll = zoneType === CardZoneType.Bar; // Determine if the zone is scrollable
  const className = zoneType === CardZoneType.Stack ? "single-card-zone" : "bar-zone"; // Determine class name based on zone type
  const zoneStyle = zoneType === CardZoneType.Stack
    ? {}
    : { overflowX: "auto" as const, whiteSpace: "nowrap" as const }; // Set styles based on zone type

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (event: React.WheelEvent) => {
    if (scrollContainerRef.current && isScrollable()) {
      event.preventDefault(); // Prevent default vertical scrolling
      scrollContainerRef.current.scrollLeft += event.deltaY; // Scroll horizontally based on vertical wheel delta
    }
  };
  const isScrollable = () => {
    if(!canScroll) return false; // If not a bar zone, no need to check scrollability
    if (scrollContainerRef.current) {
      return scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
    }
    return false;
  }

  const lockBodyScroll = () => {
    if(!isScrollable()) return; // Only lock body scroll if the zone is scrollable
    document.body.classList.add("no-scroll");
  };

  const unlockBodyScroll = () => {
    document.body.classList.remove("no-scroll");
  };

  return (
    <div
      className={`zone-container text-${textPosition}`}
      
    >
      {/* Text element */}
      <div className={`zone-text rotate-${rotate}`}>{text}</div>

      {/* The zone */}
      <Zone zoneName={zoneName} onZoneDrop={onZoneDrop}>
        <div
          className={className}
          ref={scrollContainerRef}
          onMouseEnter={lockBodyScroll} // Lock body scroll when mouse enters
          onMouseLeave={unlockBodyScroll} // Unlock body scroll when mouse leaves
          onWheel={handleWheel} // Capture mouse wheel scroll
          style={zoneStyle} // Enable horizontal scrolling
        >
          {shownCards && shownCards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              index={index}
              zoneName={zoneName}
              onCardDrop={onCardDrop}
              cardDisplayType={cardDisplayType}
              rotate={cardRotation} // Pass rotation prop to Card component
            />
          ))}
        </div>
      </Zone>
    </div>
  );
};

export default CardZone;

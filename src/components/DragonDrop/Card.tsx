import React, { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import "./Card.css"; // Import the Card CSS file
import CardContent from "components/Game/CardContent";
import { CardFace, CardType, Rotation } from "enums";
import { CardData } from "types";

interface DragItem {
  id: string;
  index: number;
  type: string;
}

interface DropCollectedProps {
  isOver: boolean;
  canDrop: boolean;
}

// Define the Card component
interface CardProps {
  card: CardData;
  index?: number;
  cardDisplayType: CardFace;
  cardTypeComponentMap: Record<CardType, React.ComponentType<any>>,
  children?: React.ReactNode; // Optional children prop for additional content
  rotate?: Rotation; // Optional prop for rotation
  zoneName: string; // Optional prop for the zone name
  onCardDrop?: (cardId: string, hoverIndex: number, zoneName: string) => void;
  contentComponent?: React.ComponentType<{ card: CardData; isFaceUp: boolean }>; // Custom content component
}

const Card: React.FC<CardProps> = ({
  card,
  index = 0,
  cardDisplayType,
  cardTypeComponentMap,
  children,
  rotate = Rotation.Normal, // Default to normal rotation
  zoneName,
  onCardDrop
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const CardComponent = cardTypeComponentMap[card.cardType] || CardContent; // Use uppercase for component

  const [isFaceUp, setIsFaceUp] = useState(
    cardDisplayType === CardFace.FaceUp || cardDisplayType === CardFace.Both
  );
  var initialRotate = 0; // Default rotation
  if (rotate === Rotation.Left) initialRotate = -90;
  else if (rotate === Rotation.Right) initialRotate = 90;
  else if (rotate === Rotation.Reverse) initialRotate = 180;
  else if (rotate === Rotation.Normal) initialRotate = 0;
  
  const [rotation, setRotation] = useState<number>(initialRotate); // State for rotation
  
  const [{ isOver }, drop] = useDrop<DragItem, void, DropCollectedProps>({
    accept: "card",
    drop: (item, monitor) => {
      if (!ref.current || !onCardDrop) return;
      
      // Perform the actual drop action when the user releases the mouse
      onCardDrop?.(item.id, index, zoneName);
    },
    hover: (item, monitor) => {
      if (!ref.current || !onCardDrop) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      // Update the item's index for visual feedback, but don't perform the actual drop yet
      item.index = hoverIndex; // This is just for hover preview
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
      canDrop: monitor.canDrop(),
    }),
  }, [index, onCardDrop, zoneName]);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "card",
    item: { id: card.id, index },
    canDrag: () => {
      if(!card.canDrag) return false; // If card cannot be dragged, return false
      var focusedElement = document.activeElement as HTMLElement;
      if ((focusedElement).closest('input, button')) return false; // Prevent dragging if interacting with input or button
      // Prevent drag if interacting with input
      return true;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleMouseClick = (event: React.MouseEvent) => {  
    if (!card.clickRotate) return; // If clickRotate is false, do nothing
    
    if (event.button === 0) {
      // Handle left click
      handleRotate(Rotation.Left); // Reset rotation on left click
    } else if (event.button === 2) {
      event.preventDefault(); // Prevent default context menu
      // Handle right click
      handleRotate(Rotation.Right); // Rotate right on right click
    }
  };
  const handleFlip = () => {
    setIsFaceUp(!isFaceUp);
  };

  const handleRotate = (direction: Rotation) => {
    setRotation((prevRotation) => {
      if (direction === Rotation.Left)
        return (prevRotation - 90); // Rotate counterclockwise
      else if (direction === Rotation.Right)
        return (prevRotation + 90); // Rotate clockwise
      else if (direction === Rotation.Normal)
        return 0; // Reset to normal orientation
      else if (direction === Rotation.Reverse)
        return 180; // Rotate to reverse orientation
      return prevRotation; // No change
    });
  };
  
  const handleOrientation = (direction: Rotation) => {
    setRotation((prevRotation) => {
      switch (direction) {
        case Rotation.Left:
          return -90; // Rotate counterclockwise
        case Rotation.Right:
          return 90; // Rotate clockwise
        case Rotation.Normal:
          return 0; // Reset to normal orientation
        case Rotation.Reverse:
          return 180; // Rotate to reverse orientation
        default:
          return prevRotation;
      }
    });
  };
  drag(drop(ref));

  return (
    <div 
      className="card-container"
      style={{
        width: rotation % 180 === 0 ? "146px" : "220px", // Swap width and height for 90/270 degrees
        height: rotation % 180 === 0 ? "220px" : "146px",
        transition: "width 0.2s ease, height 0.2s ease", // Smoothly adjust width and height
      }}
    >
      {/* Floating toolbar */}
      <div className="card-toolbar">
        <ToolbarButton
          icon="👁"
          onClick={() => handleFlip()}
        />
        <ToolbarButton
          icon="▲"
          onClick={() => handleOrientation(Rotation.Normal)}
        />
        <ToolbarButton
          icon="◄"
          onClick={() => handleOrientation(Rotation.Left)}
        />
        <ToolbarButton
          icon="►"
          onClick={() => handleOrientation(Rotation.Right)}
        />
        <ToolbarButton
          icon="▼"
          onClick={() => handleOrientation(Rotation.Reverse)}
        />

      </div>

      {/* Rotating card content */}
      <div
        className={`card ${isFaceUp ? "" : "card-back"} ${isOver ? "card-drop-target" : ""}`}
        ref={ref}
        draggable={card.canDrag} // Prevent dragging when input is active
        style={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: isFaceUp ? card.cardColor : "#f0f0f0", // Apply card color when face up
          transform: `rotate(${rotation}deg)`, // Apply rotation
          border: isOver ? "2px solid #007bff" : undefined, // Highlight border when hovering
        }}
        onClick={handleMouseClick}
        onContextMenu={handleMouseClick}
      >
        {children}
        {isFaceUp ? (
          <CardComponent card={card} isFaceUp={isFaceUp} />
        ) : (
          <div className="card-back-content"></div>
        )}

      </div>
    </div>
  );
};

// create toolbar button component
const ToolbarButton: React.FC<{
  icon: string;
  onClick: () => void;
}> = ({ icon, onClick }) => {
  return (
    <button className="toolbar-button" onClick={onClick}>
      {icon}
    </button>
  );
};

export default Card;

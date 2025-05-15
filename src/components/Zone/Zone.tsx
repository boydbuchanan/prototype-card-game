import React from "react";
import { useDrop } from "react-dnd";
import "./Zone.css"; // Import the Zone CSS file

interface ZoneProps {
  zoneName: string;
  onZoneDrop: (cardId: string, zoneName: string) => void;
  children: React.ReactNode;
}

const Zone: React.FC<ZoneProps> = ({ zoneName, onZoneDrop, children }) => {
  const [{ isOver, isOverCurrent }, drop] = useDrop(() => ({
    accept: "card",
    drop: (item: { id: string }, monitor) => {
    // hover: (item: { id: string }, monitor) => {
      // Only handle the drop if directly over this drop target
      if (monitor.isOver({ shallow: true })) {
        onZoneDrop(item.id, zoneName);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
  }));

  const dropRef = React.useRef<HTMLDivElement>(null);
  drop(dropRef);

  return (
    <div ref={dropRef} className={`zone-container ${isOver ? "highlight" : ""}`}>
      <div className="card-list">{children}</div>
    </div>
  );
};

export default Zone;

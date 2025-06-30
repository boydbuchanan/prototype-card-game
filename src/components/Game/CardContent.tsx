import React from "react";
import { CardData } from "types";

interface CardContentProps {
  card: CardData;
  isFaceUp: boolean;
}

const CardContent: React.FC<CardContentProps> = ({ card, isFaceUp }) => {
  return (
    <>
      <h3 className="center-text">{isFaceUp ? card.cardName : ""}</h3>
      <h4 className="center-text">{isFaceUp ? card.cardType : ""}</h4>
      <p className="card-text">{isFaceUp ? card.cardText : ""}</p>
    </>
  );
};

export default CardContent;

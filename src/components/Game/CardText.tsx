import React from "react";
import { CardData } from "types";

interface CardTextProps {
  card: CardData;
}

const CardText: React.FC<CardTextProps> = ({ card }) => {
  return (
    <>
      <h3 className="center-text">{card.cardName}</h3>
      <p className="card-text">{card.cardText}</p>
      <h4 className="center-text">{card.cardType}</h4>
    </>
  );
};

export default CardText;

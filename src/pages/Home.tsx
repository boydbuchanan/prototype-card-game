"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlayZone, CardZone } from "components/Zone";


import { CardFace, CardZoneType, Position, Rotation } from "enums";

import "styles/Play.css"; // Import the Zone CSS file
import { CardData, GameSetup } from "types";

export const defaultSetup: GameSetup = {
  Players: 1,
  Cards: [],
  SharedZones: [{
    RowName: "Shared",
    Zones:[
      {
        Name: "Deck",
        CardDisplay: CardFace.FaceDown,
        ZoneType: CardZoneType.Stack,
        TextPosition: Position.Top,
      },
      {
        Name: "Discard",
        CardDisplay: CardFace.FaceUp,
        ZoneType: CardZoneType.Stack,
        TextPosition: Position.Bottom,
      },
    ]
  }],
  PlayerZones: [
    {
      RowName: "In Play",
      Zones:[
        {
          Name: "In Play",
          CardDisplay: CardFace.Both,
          ZoneType: CardZoneType.Bar,
          TextPosition: Position.Left,
        },
      ]
    },{
      RowName: "Resource",
      Zones:[
      {
        Name: "Resource",
        CardDisplay: CardFace.FaceUp,
        ZoneType: CardZoneType.Bar,
        CardRotation: Rotation.Left,
        TextPosition: Position.Left,
      },
    ]
  },{
      RowName: "Player",
      Zones: [
      {
        Name: "Hand",
        CardDisplay: CardFace.Both,
        ZoneType: CardZoneType.Bar,
        TextPosition: Position.Left,
      },
      {
        Name: "Removed",
        CardDisplay: CardFace.FaceUp,
        ZoneType: CardZoneType.Stack,
        TextPosition: Position.Right,
      },
    ]
  }],
};



export function Page({ cardData, gameSetup }: { cardData?: CardData[] | null, gameSetup?: GameSetup }) {
  const game = useMemo(() => gameSetup || defaultSetup, [gameSetup]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({});

  // Initialize cards state when cardData or game changes
  useEffect(() => {
    if (!Array.isArray(cardData) || cardData.length === 0) {
      setCards({});
      return;
    }

    const updatedCards: Record<string, CardData[]> = {
      "Deck": cardData.filter((card) => card.startZone === "Deck" && card.playerId === "0"),
      "Play": [],
    };

    // Initialize shared zones
    game.SharedZones.forEach((row) => {
      row.Zones.forEach((zone) => {
        if (!updatedCards[zone.Name]) {
          updatedCards[zone.Name] = cardData.filter(
            (card) => card.startZone === zone.Name && card.playerId === "0"
          );
        }
      });
    });

    // Initialize player zones
    for (let i = 1; i <= game.Players; i++) {
      game.PlayerZones.forEach((row) => {
        row.Zones.forEach((zone) => {
          const zoneId = `${zone.Name}-${i}`;
          if (!updatedCards[zoneId]) {
            updatedCards[zoneId] = cardData.filter(
              (card) => card.startZone === zone.Name && card.playerId === `${i}`
            );
          }
        });
      });
    }

    setCards(updatedCards);
  }, [cardData, game]);

  const findCard = (
    cards: Record<string, CardData[]>,
    cardId: string
  ): { card: CardData | null; zone: string | null; index: number | null } => {
    for (const zone in cards) {
      const index = cards[zone]?.findIndex((card) => card.id === cardId);
      if (index !== -1 && index !== undefined) {
        return { card: cards[zone][index], zone, index }; // Return the card, zone, and index
      }
    }
    return { card: null, zone: null, index: null }; // Return null if the card is not found
  };
  const removeCard = (cards: Record<string, CardData[]>, cardId: string): Record<string, CardData[]> => {
    const updatedCards = { ...cards };
    for (const zone in updatedCards) {
      updatedCards[zone] = updatedCards[zone].filter(
        (card) => card.id !== cardId
      );
    }
    return updatedCards;
  };
  
  const handleZoneDrop = (cardId: string, newZone: string) => {
    console.log("Card ID:", cardId, "New Zone:", newZone);
    setCards((prevCards) => {
      // Find the card in the previous cards state
      const { card: movedCard } = findCard(prevCards, cardId);

      if (!movedCard) {
        return prevCards; // Card not found, return the previous state
      }

      // Filter out the moved card from the previous cards
      const updatedCards = removeCard(prevCards, cardId);

      // Ensure the new zone exists
      if (!updatedCards[newZone]) {
        updatedCards[newZone] = []; // Initialize the new zone if it doesn't exist
      }

      // Add the moved card to the new zone at the end
      const movedCardWithNewZone = { ...movedCard };
      updatedCards[newZone].push(movedCardWithNewZone);

      return updatedCards;
    });
  };

  const handleCardDrop = async (cardId: string, hoverIndex: number, zoneName: string) => {
    console.log("Card ID:", cardId, "Hover Index:", hoverIndex, "Zone Name:", zoneName);
    var prevCards = cards;
    // setCards((prevCards) => {
      
      const { card, zone, index } = findCard(prevCards, cardId);

      if (!card || !zone || index === null) {
        return prevCards; // Card not found, return the previous state
      }
      // if card is already in zone at the index, do nothing
      if (zone === zoneName && index === hoverIndex) {
        console.log(`Card ${card.id} is already in the same zone at the same index`);
        return prevCards; // Card is already in the same zone at the same index, do nothing
      }
      
      const updatedCards = { ...prevCards };
      // Log the cards id in order
      console.log("Cards in zone before drop:", updatedCards[zone].map((c) => c.id));
      // Remove the card from its current zone
      if(zone !== zoneName) {
        console.log(`Card ${card.id} is being moved from ${zone} to ${zoneName}`);
        updatedCards[zone] = updatedCards[zone].filter((card) => card.id !== cardId);
        // add to new zone at the hover index
        updatedCards[zoneName].splice(hoverIndex, 0, card); // Insert at the hover index
      }else{
        console.log(`Card ${card.id} is being moved within the same zone ${zoneName}`);
        // If the card is dropped in the same zone, just update its position
        const currentZoneCards = updatedCards[zoneName];
        const cardIndex = currentZoneCards.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          const [movedCard] = currentZoneCards.splice(cardIndex, 1); // Remove the card from its current position
          currentZoneCards.splice(hoverIndex, 0, movedCard); // Insert at the hover index
        }
      }

      // Log the cards id in order
      console.log("Cards in zone after drop:", updatedCards[zoneName].map((c) => c.id));
      await setCards(updatedCards); // Update the state with the new cards
      // return updatedCards;
      
    // });
  }

  return (
    <div className="app">
      <div className="play-area">
        <DndProvider backend={HTML5Backend}>
          <div className="area-row">
            <PlayZone
              zoneName="Play"
              cards={cards.Play}
              onZoneDrop={handleZoneDrop}

              cardDisplayType={CardFace.Both}
            />
            <div className="shared-zones">
              {game.SharedZones.map((row) => (
                <div key={row.RowName} className="shared-zone-row">
                  {row.Zones.map((zone) => (
                    <CardZone
                      key={zone.Name}
                      zoneName={zone.Name}
                      zoneType={zone.ZoneType}
                      textPosition={zone.TextPosition}
                      cardRotation={zone.CardRotation}
                      cards={cards[zone.Name]}
                      onZoneDrop={handleZoneDrop}
                      onCardDrop={handleCardDrop}
                      cardDisplayType={zone.CardDisplay}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* For each Player create a player zone */}
          <div className="player-area">
            {Array.from({ length: game.Players }, (_, i) => i + 1).map((playerId) => (
              <div key={playerId} className="player-zone">
                {game.PlayerZones.map((row) => (
                  <div key={row.RowName} className="zones-row">
                    {row.Zones.map((zone) => {
                      const zoneId = `${zone.Name}-${playerId}`; // Unique ID for player-specific zones
                      return (
                        <CardZone
                          key={zoneId}
                          zoneName={zoneId}
                          zoneType={zone.ZoneType}
                          textPosition={zone.TextPosition}
                          cardRotation={zone.CardRotation}
                          cards={cards[zoneId]}
                          onZoneDrop={handleZoneDrop}
                          onCardDrop={handleCardDrop}
                          cardDisplayType={zone.CardDisplay}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DndProvider>
      </div>
    </div>
  );
}

export default Page;

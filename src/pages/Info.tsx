import React from "react";
import "../App.css";

export default function InfoPage() {
  return (
    <div className="info-container">
      <h1>GameSetup Structure</h1>
      <p>
        <strong>GameSetup</strong> is the main configuration object that defines the structure of your card game. It determines how many players there are, what cards are in the game, and how the play areas (zones) are organized.
      </p>
      <h2>Structure</h2>
      <pre className="info-pre">
{`interface GameSetup {
  Players: number;           // Number of players in the game
  Cards: CardData[];         // All cards in the game
  SharedZones: RowSetup[];   // Zones shared by all players (e.g., Deck, Discard)
  PlayerZones: RowSetup[];   // Zones each player has (e.g., Hand, In Play)
}

interface RowSetup {
  RowName: string;           // Name of the row (e.g., "Shared", "Player")
  Zones: ZoneSetup[];        // Array of zones in this row
}

interface ZoneSetup {
  Name: string;              // Name of the zone (e.g., "Deck", "Hand")
  CardDisplay: CardFace;     // How cards are displayed (FaceUp, FaceDown, Both)
  ZoneType: CardZoneType;    // Type of zone (Stack, Bar, etc.)
  CardRotation?: Rotation;   // Optional: rotation of cards in this zone
  TextPosition?: Position;   // Optional: where the zone label appears
}`}
      </pre>
      <h2>How it works</h2>
      <ul>
        <li>
          <strong>Players</strong>: Sets the number of players. Used to generate player-specific zones.
        </li>
        <li>
          <strong>Cards</strong>: The list of all cards in the game, usually loaded from a CSV file.
        </li>
        <li>
          <strong>SharedZones</strong>: Defines rows of zones that are shared by all players (e.g., Deck, Discard).
        </li>
        <li>
          <strong>PlayerZones</strong>: Defines rows of zones that each player gets (e.g., Hand, In Play, Resource).
        </li>
      </ul>
      <h2>Example</h2>
      <pre className="info-pre">
{`const gameSetup: GameSetup = {
  Players: 1,
  Cards: [],
  SharedZones: [
    {
      RowName: "Shared",
      Zones: [
        { Name: "Deck", CardDisplay: CardFace.FaceDown, ZoneType: CardZoneType.Stack, TextPosition: Position.Top },
        { Name: "Discard", CardDisplay: CardFace.FaceUp, ZoneType: CardZoneType.Stack, TextPosition: Position.Bottom }
      ]
    }
  ],
  PlayerZones: [
    {
      RowName: "Player",
      Zones: [
        { Name: "Hand", CardDisplay: CardFace.Both, ZoneType: CardZoneType.Bar, TextPosition: Position.Left }
      ]
    }
  ]
};`}
      </pre>
      <h2>Customizing</h2>
      <ul>
        <li>
          Add or remove zones and rows to fit your game’s needs.
        </li>
        <li>
          Use <strong>CardDisplay</strong> to control if cards are face up, face down, or both.
        </li>
        <li>
          Use <strong>ZoneType</strong> to control how cards are arranged (stacked, in a row, etc).
        </li>
        <li>
          <strong>CardRotation</strong> and <strong>TextPosition</strong> are optional for layout tweaks.
        </li>
      </ul>
      <h2>Card Rotation & Toolbar Functions</h2>
      <p>
        Each card features a floating toolbar that appears when you hover over the card. The toolbar provides quick actions:
      </p>
      <ul>
        <li>
          <strong>👁 (Eye):</strong> Flip the card face up or face down.
        </li>
        <li>
          <strong>▲ ◄ ► ▼ (Arrows):</strong> Instantly rotate the card to normal, left, right, or upside-down orientation.
        </li>
      </ul>
      <p>
        You can also rotate a card by left- or right-clicking on it. The toolbar is positioned above the card and will remain visible as long as your mouse is over the card or the toolbar itself.
      </p>
    </div>
  );
}
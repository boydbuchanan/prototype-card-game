# Prototype Card Game

Prototype Card Game is a web application built with React that allows you to customize game setup and import cards. It provides a drag-and-drop interface for managing different zones of cards, such as deck, hand, play area, and discard pile.

You may customize the Droppable Zones between 
- Stacks 
    - Single Card Face up or Down
- Bar
    - Row of Cards that can default to portrait or landscape
    - Sortable, move cards to different slots
- Play
    - Area to drag and drop anywhere

Card Actions
- Click and Hold to drag cards
- Left Click to turn counter clockwise
- Right Click to turn clockwise
- Toolbar: Show hide and quick set rotation

Import
- Game Setup
- Card Data

View @ [boydbuchanan.github.io/prototype-card-game](https://boydbuchanan.github.io/prototype-card-game/)
---

## Table of Contents

- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [GameSetup Structure](#gamesetup-structure)
- [How it Works](#how-it-works)
- [Example](#example)
- [Customizing](#customizing)
- [Card Rotation & Toolbar Functions](#card-rotation--toolbar-functions)
- [Learn More](#learn-more)

---

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run the development server:**
   ```sh
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

3. **Build for production:**
   ```sh
   npm run build
   ```
   The build output will be in the `build` folder.

4. **Run tests:**
   ```sh
   npm test
   ```

---

## Available Scripts

- `npm start` — Runs the app in development mode.
- `npm test` — Launches the test runner.
- `npm run build` — Builds the app for production.
- `npm run eject` — Ejects the app (not recommended unless you need full control).

---

## GameSetup Structure

**GameSetup** is the main configuration object that defines the structure of your card game. It determines how many players there are, what cards are in the game, and how the play areas (zones) are organized.

### Structure

```ts
interface GameSetup {
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
}
```

---

## How it Works

- **Players:** Sets the number of players. Used to generate player-specific zones.
- **Cards:** The list of all cards in the game, usually loaded from a CSV file.
- **SharedZones:** Defines rows of zones that are shared by all players (e.g., Deck, Discard).
- **PlayerZones:** Defines rows of zones that each player gets (e.g., Hand, In Play, Resource).

---

## Example

```ts
const gameSetup: GameSetup = {
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
};
```

---

## Customizing

- Add or remove zones and rows to fit your game’s needs.
- Use **CardDisplay** to control if cards are face up, face down, or both.
- Use **ZoneType** to control how cards are arranged (stacked, in a row, etc).
- **CardRotation** and **TextPosition** are optional for layout tweaks.

---

## Card Rotation & Toolbar Functions

Each card features a floating toolbar that appears when you hover over the card. The toolbar provides quick actions:

- **👁 (Eye):** Flip the card face up or face down.
- **▲ ◄ ► ▼ (Arrows):** Instantly rotate the card to normal, left, right, or upside-down orientation.

You can also rotate a card by left- or right-clicking on it. The toolbar is positioned above the card and will remain visible as long as your mouse is over the card or the toolbar itself.

---

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)

## Attribution

This is a modified version of https://github.com/poeticmatter/card-game-prototype

I aimed to move to typescript, and created customizable game setup with more drag and drop zones and added features, such as Zone sorting and card rotations.
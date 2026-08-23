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
- Card controls: click to rotate, Ctrl/Cmd + click to flip

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
- [Card Controls](#card-controls)
- [Learn More](#learn-more)

---

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run the development server:**
   ```sh
   npm run dev
   ```
   Open [http://localhost:5173/prototype-card-game/](http://localhost:5173/prototype-card-game/)
   to view it in your browser. The path comes from `base` in `vite.config.ts`, which is the
   same in development and production so a base-path mistake shows up locally.

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

- `npm run dev` (or `npm start`) — Runs the Vite dev server.
- `npm test` — Runs the Vitest suite.
- `npm run build` — Type-checks, then builds for production into `build/`.
- `npm run preview` — Serves the production build locally.
- `npm run deploy` — Builds and publishes `build/` to GitHub Pages.

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

## Card Controls

Cards are driven entirely by the pointer:

- **Drag** to move a card into a zone, or onto the canvas to leave it loose.
- **Left click** rotates counter-clockwise, **right click** rotates clockwise.
- **Ctrl/Cmd + click** flips the card over.

Rotation is unbounded on purpose — turning a card left from upright animates a quarter turn
rather than three quarters the other way. Rotation, face and position belong to the card's
board state, so a card keeps its orientation when it moves, and **Save Board** records it.

---

## Table Controls

The bar at the bottom of the play area changes how the table is presented, not what is on it:

- **Table** — switch between a square and a rectangle.
- **Players** — add or remove seats. Removing a seat leaves its cards exactly where they were
  sitting, as free cards on the canvas; nothing is discarded by reshaping the table mid-game.
- **View from** — turn the board so a given seat faces you.

Seats past the player count still show, greyed out, so the shape of the table stays readable.
They have no zones and cannot take a drop.

The initial seat count comes from `players` in the scenario, falling back to `Players` in the
game setup.

**Moving around:** drag the background to pan, or use the wheel. Ctrl/Cmd + wheel zooms.

---

## Learn More

- [Vite documentation](https://vite.dev/guide/)
- [React documentation](https://react.dev/)

## Attribution

This is a modified version of https://github.com/poeticmatter/card-game-prototype

I aimed to move to typescript, and created customizable game setup with more drag and drop zones and added features, such as Zone sorting and card rotations.
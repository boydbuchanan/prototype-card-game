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
  TableShape?: TableShape;   // square | round | rectangle
  TableSize?: TableSize;     // Optional override. Omit to use the default size chart
  TableUnit?: RealUnit;      // "cm" (default) or "in"
  SharedZones: RowSetup[];   // Zones shared by all players (e.g., Deck, Discard)
  PlayerZones: RowSetup[];   // Zones each player has (e.g., Hand, In Play)
  TrayZones?: RowSetup[];    // Screen-fixed zones, off the table entirely
}

interface RowSetup {
  RowName: string;           // Name of the row (e.g., "Shared", "Player")
  Zones: ZoneSetup[];        // Array of zones in this row
  OnTable?: boolean;         // False hangs the row off the table edge. Default true
}

interface ZoneSetup {
  Name: string;              // Name of the zone (e.g., "Deck", "Hand")
  CardDisplay: CardFace;     // How cards are displayed (FaceUp, FaceDown, Both)
  ZoneType: CardZoneType;    // Stack, Row or Column
  TextPosition?: Position;   // Optional: where the zone label appears
}
```

### Cards are pixels; the table is real

**A card never scales.** It is authored in pixels and always renders at those pixels, whatever
unit the table uses — switching the table from inches to centimetres does not touch it.

**The table is a real measurement**, converted at 100px per inch, so a centimetre is 39.37px
and a 150cm table renders 5906px. Choosing the card's pixel size is therefore what decides how
big a real table looks next to it: at the shipped 250×350px card, a 150cm table is 23 cards
across.

**Size comes from a chart of real dining tables** keyed by shape and seat count, so picking a
shape and a player count is enough — the table steps up as players are added. Past the largest
charted table it keeps growing the same way: longer but no deeper for a rectangle, wider all
round for a square, a bigger circle for a round table.

A designer who wants a specific table ticks **Custom size** and enters it, or authors
`TableSize` in the setup. Either way the size is then theirs and adding a player stops
resizing the table; clearing the override hands it back to the chart.

Sizes are whole units, in centimetres by default. Inches are the coarser option — a whole inch
is a bigger step — so `"TableUnit": "in"` trades precision for familiarity. Switching unit restates the same table rather than resizing it, give or take
the rounding to whole units.

### On the table, or off it

`OnTable` says whether a row takes up table space. A hand is held rather than laid down, so
`"OnTable": false` hangs that row off the table edge in front of the player, where it occupies
no surface. On-table rows stack inward onto the table from the same edge. `TrayZones` are off
the table *and* fixed to the screen, for things like a token supply.

---

## How it Works

- **Players:** Sets the number of players. Used to generate player-specific zones.
- **TableShape / TableSize:** The table's outline and its real dimensions. Shape decides how
  seats distribute; size decides the footprint. The table never grows to fit its players.
- **SharedZones:** Defines rows of zones that are shared by all players (e.g., Deck, Discard).
- **PlayerZones:** Defines rows of zones that each player gets (e.g., Hand, In Play, Resource).
  A setup with none gets no seats at all — a solitaire table is just its shared zones.

---

## Example

```ts
const gameSetup: GameSetup = {
  Players: 1,
  TableShape: TableShape.Square,
  TableSize: { width: 35.4, height: 35.4 },
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

The panel at the bottom left changes how the table is presented, not what is on it. Setting the
table up is rare, so it collapses behind **▸ Table**; **View from** is not, so it stays out:

- **Table** — square, round or rectangle.
- **Custom size** — off by default, showing the chart's size for the current shape and player
  count. Tick it to pick **in / cm** and enter the table's width × length yourself.
- **Players** — add or remove seats. Removing a seat leaves its cards exactly where they were
  sitting, as free cards on the canvas; nothing is discarded by reshaping the table mid-game.
- **View from** — turn the board so a given seat faces you.

The table does not grow to accommodate players. Add enough and their boards overlap — that is
the point, since it shows a layout does not fit the table you actually own.

Seats fill the way people actually sit down. On a square or round table, one per side before
any side doubles up. On a rectangle, the long sides take two apiece first — so 1–4 sit two and
two facing each other — then the two ends, then the long sides keep growing, with 7 and 8
making it three a side. An end never takes more than one seat.

The initial seat count comes from `players` in the scenario, falling back to `Players` in the
game setup.

**Moving around:** drag the background to pan, or use the wheel. Ctrl/Cmd + wheel zooms, and
**Fit** frames the whole table.

---

## Learn More

- [Vite documentation](https://vite.dev/guide/)
- [React documentation](https://react.dev/)

## Attribution

This is a modified version of https://github.com/poeticmatter/card-game-prototype

I aimed to move to typescript, and created customizable game setup with more drag and drop zones and added features, such as Zone sorting and card rotations.
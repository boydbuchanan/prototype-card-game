import React from "react";

const InfoPage: React.FC = () => (
  <div className="info-container">
    <h1>Prototype Card Game</h1>
    <p>
      Drag-and-drop card prototyping. Four files describe a game, and each owns a different
      concern — so you can change the board without touching the cards, or restyle the cards
      without touching either.
    </p>

    <h2>The four files</h2>
    <table className="info-table">
      <thead>
        <tr><th>File</th><th>Owns</th><th>Upload as</th></tr>
      </thead>
      <tbody>
        <tr><td><code>gameSetup.json</code></td><td>Zones, rows, player count</td><td>GameSetup JSON</td></tr>
        <tr><td><code>cardTemplates.json</code></td><td>How a card looks</td><td>Card Templates</td></tr>
        <tr><td><code>cards.csv</code></td><td>What cards exist</td><td>Cards CSV</td></tr>
        <tr><td><code>scenario.json</code></td><td>Where cards are, and how they sit</td><td>Scenario</td></tr>
      </tbody>
    </table>
    <p>
      Nothing is uploaded to a server — every file is read in your browser. <b>Save Board</b>
      writes the current state back out as a scenario, so you can stop mid-game and pick up
      exactly where you left off.
    </p>

    <h2>gameSetup.json</h2>
    <pre className="info-pre">{`{
  "Players": 2,
  "SharedZones": [
    { "RowName": "Shared", "Zones": [
      { "Name": "Play", "CardDisplay": "both",     "ZoneType": 1, "TextPosition": "top" },
      { "Name": "Deck", "CardDisplay": "faceDown", "ZoneType": 0, "TextPosition": "top" }
    ]}
  ],
  "PlayerZones": [
    { "RowName": "Player", "Zones": [
      { "Name": "Hand", "CardDisplay": "both", "ZoneType": 1, "TextPosition": "left" }
    ]}
  ]
}`}</pre>
    <p>
      <b>ZoneType is a number:</b> <code>0</code> Stack (shows the top card only),{" "}
      <code>1</code> Row (ordered left to right), <code>2</code> Column (ordered top to
      bottom). A zone only imposes order — to place a card anywhere, drop it on the canvas
      outside every zone. <b>CardDisplay</b> is <code>"faceUp"</code>, <code>"faceDown"</code>{" "}
      or <code>"both"</code>, and sets which way up a card starts.
    </p>
    <p>
      <b>Zone ids.</b> A shared zone's id is <code>RowName-Name</code>; a player zone's is{" "}
      <code>Name-playerNumber</code>. Scenarios address zones by these ids, so player zone
      names must be unique across all player rows.
    </p>

    <h2>cards.csv</h2>
    <pre className="info-pre">{`id,cardName,cardType,state,left,right,explain
1,Hammer,Item,Inactive,Equip,Swing,3 damage to one target`}</pre>
    <p>
      Only <code>id</code>, <code>cardName</code> and <code>cardType</code> are fixed, and{" "}
      <code>id</code> must be unique. Every other column is yours: a card template pulls a
      column by name. Cards carry no styling and no position — those live in the template and
      the scenario.
    </p>

    <h2>cardTemplates.json</h2>
    <p>
      Templates are keyed by <code>cardType</code>, with <code>default</code> used for any type
      that has none. A template is a list of regions; a region is a rect on the card that draws
      a background and, optionally, text from one column.
    </p>
    <pre className="info-pre">{`{
  "card": { "width": 146, "height": 220, "radius": 8 },
  "styles": { "active": { "bg": "#E8791A", "color": "#1A0F04", "weight": 600 } },
  "templates": {
    "Item": {
      "frame": "frames/item.svg",
      "regions": [
        { "rect": [12, 0, 76, 8], "rotate": 180, "column": "state", "style": "active" },
        { "rect": [0, 8, 13, 62], "rotate": 90,  "column": "left",  "style": "active" }
      ]
    }
  }
}`}</pre>
    <p>
      <code>rect</code> is <code>[x, y, w, h]</code> as a percentage of the card. Regions draw
      in order, so later ones paint over earlier ones. Style properties — <code>bg</code>,{" "}
      <code>color</code>, <code>size</code>, <code>weight</code>, <code>align</code> — can be
      named in <code>styles</code>, written inline, or set on the region to override it. Text
      always wraps.
    </p>
    <p>
      <b>The template draws the whole card.</b> Nothing is painted underneath it — no border,
      no background, no rounded corner unless <code>card.radius</code> asks for one. A{" "}
      <code>bg</code> (and the card <code>frame</code>) is either an image URL or a CSS colour
      or gradient; an SVG is linked like any other image, so put it in <code>public/</code> and
      reference it by path.
    </p>
    <p>
      <b><code>rotate</code> is where the region is printed</b>, fixed at authoring time — a
      printed card's ink doesn't move when you turn the card. A region reads upright when{" "}
      <code>cardRotation + rotate ≡ 0°</code>, so one card face can carry a different ruleset
      on each edge.
    </p>

    <h2>scenario.json</h2>
    <pre className="info-pre">{`{
  "name": "Turn 3",
  "players": 4,
  "defaults": {
    "zone": "Shared-Deck",
    "byType": { "Item": { "zone": "Hand", "player": 1 } }
  },
  "placements": [
    { "id": "1", "zone": "Hand", "player": 1, "rotation": 90, "faceUp": true },
    { "id": "7", "zone": "Shared-Play", "x": 320, "y": 180 }
  ]
}`}</pre>
    <p>
      Resolution order per card: an explicit <code>placement</code>, then a <code>byType</code>{" "}
      default, then the scenario-wide default, then the first zone in the setup. So a scenario
      is usually short — you only spell out what's unusual.
    </p>
    <p>
      <code>players</code> seats the table, overriding <code>Players</code> in the setup. It is a
      starting point, not a lock — the table controls change the seat count while you play.
    </p>
    <p>
      The same shape is a starting setup, a save file and a scenario definition. That is what
      makes a quest, a boss fight, or one specific mid-turn position just another file.
    </p>

    <h2>Table controls</h2>
    <p>
      The bar at the bottom of the play area changes how the table is presented, not what is on
      it. <b>Table</b> switches between a square and a rectangle, <b>Players</b> adds and removes
      seats, and <b>View from</b> turns the board so a given seat faces you.
    </p>
    <p>
      Removing a seat does not discard its cards: each one stays exactly where it was sitting and
      becomes a free card on the canvas, so nothing is lost by reshaping the table mid-game. Seats
      past the player count still appear, greyed out, so the shape of the table stays readable —
      but they have no zones and cannot take a drop.
    </p>
    <p>
      <b>Moving around:</b> drag the background to pan, or use the wheel. Ctrl/Cmd + wheel zooms,
      as do the controls in the bottom right.
    </p>

    <h2>Card controls</h2>
    <ul>
      <li><b>Drag</b> to move a card into a zone, or onto the canvas to leave it loose.</li>
      <li><b>Left click</b> rotates counter-clockwise, <b>right click</b> clockwise.</li>
      <li><b>Ctrl/Cmd + click</b> flips the card over.</li>
    </ul>
    <p>
      Rotation, face and position belong to the card's board state rather than to the zone it
      sits in — so a card keeps its orientation when you move it, and <b>Save Board</b> records
      it.
    </p>
  </div>
);

export default InfoPage;

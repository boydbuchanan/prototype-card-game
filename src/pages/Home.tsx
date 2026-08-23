"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Zone from "components/Board/Zone";
import Card from "components/Board/Card";
import { PlayArea, PlayAreaHandle } from "components/Board/PlayArea";
import { CardFace, CardZoneType, Position, TableShape } from "enums";
import { DragProvider, DropTarget, ViewState } from "components/Game/drag";
import { buildTable, Seat } from "components/Game/seats";
import {
  buildBoard, listZones, playerCount, reconcileZones, ZoneRow, zoneRows,
} from "components/Game/scenario";

import "styles/Play.css";
import { BoardState, CardData, GameSetup, Scenario } from "types";

export const defaultSetup: GameSetup = {
  Players: 4,
  TableShape: TableShape.Square,
  SharedZones: [{
    RowName: "Shared",
    Zones: [
      { Name: "Deck", CardDisplay: CardFace.FaceDown, ZoneType: CardZoneType.Stack, TextPosition: Position.Top },
      { Name: "Discard", CardDisplay: CardFace.FaceUp, ZoneType: CardZoneType.Stack, TextPosition: Position.Top },
    ]
  }],
  PlayerZones: [
    {
      RowName: "In Play",
      Zones: [
        { Name: "In Play", CardDisplay: CardFace.Both, ZoneType: CardZoneType.Row, TextPosition: Position.Left },
      ]
    }, {
      RowName: "Player",
      Zones: [
        { Name: "Hand", CardDisplay: CardFace.Both, ZoneType: CardZoneType.Row, TextPosition: Position.Left },
        { Name: "Removed", CardDisplay: CardFace.FaceUp, ZoneType: CardZoneType.Stack, TextPosition: Position.Right },
      ]
    }],
  TrayZones: [{
    RowName: "Tray",
    Zones: [
      { Name: "Tokens", CardDisplay: CardFace.FaceUp, ZoneType: CardZoneType.Column, TextPosition: Position.Top },
    ]
  }],
};

/** Shared empty list, so a zone with no cards keeps a stable `cards` identity. */
const NO_CARDS: CardData[] = [];

const MIN_PLAYERS = 1;
/** A cap on the control, not on the model: buildTable grows the table for any count. */
const MAX_PLAYERS = 8;

interface Seating {
  shape: TableShape;
  players: number;
}

interface PageProps {
  cardData?: CardData[] | null;
  gameSetup?: GameSetup;
  scenario?: Scenario | null;
  onBoardChange?: (board: { state: BoardState; order: Record<string, string[]>; players: number }) => void;
}

export function Page({ cardData, gameSetup, scenario, onBoardChange }: PageProps) {
  const game = useMemo(() => gameSetup || defaultSetup, [gameSetup]);

  /** Table shape and seat count. Seeded from the data, then owned by the controls. */
  const [seating, setSeating] = useState<Seating>(() => ({
    shape: game.TableShape || TableShape.Square,
    players: playerCount(game, scenario),
  }));
  // Mirrors `seating` for the handler below, which must see its own previous
  // change: two quick clicks on + land in one React batch, and reading state
  // there would make the second click repeat the first.
  const seatingRef = useRef(seating);
  const table = useMemo(() => buildTable(seating.shape, seating.players), [seating]);

  /** Which seat is brought to the bottom of the screen. A view control, not game state. */
  const [viewSeat, setViewSeat] = useState(0);
  const playArea = useRef<PlayAreaHandle>(null);
  // Live zoom/rotation, written by PlayArea and read by the drag layer so a
  // dragged card tracks the cursor on a rotated canvas.
  const view = useRef<ViewState>({ zoom: 1, rotation: 0 });

  // Card definitions by id — the catalogue, never mutated by play.
  const byId = useMemo(() => {
    const m: Record<string, CardData> = {};
    (cardData || []).forEach((c) => { m[String(c.id)] = c; });
    return m;
  }, [cardData]);

  const [board, setBoard] = useState<BoardState>({});
  const [order, setOrder] = useState<Record<string, string[]>>({});

  // New data resets the table as well as the board, so the two are always built
  // from the same seat count.
  useEffect(() => {
    const players = playerCount(game, scenario);
    seatingRef.current = { shape: game.TableShape || TableShape.Square, players };
    setSeating(seatingRef.current);
    setViewSeat(0);

    if (!Array.isArray(cardData) || cardData.length === 0) {
      setBoard({}); setOrder({});
      return;
    }
    const built = buildBoard(cardData, game, scenario ?? null, players);
    setBoard(built.state);
    setOrder(built.order);
  }, [cardData, game, scenario]);

  useEffect(
    () => { onBoardChange?.({ state: board, order, players: seating.players }); },
    [board, order, seating.players, onBoardChange]
  );

  // Every zone id, label and layout hint comes from here — one source, so the
  // ids the board is keyed by can never drift from the ids that get rendered.
  const sharedRows = useMemo(() => zoneRows(game, "shared"), [game]);
  const trayRows = useMemo(() => zoneRows(game, "tray"), [game]);
  // An empty seat is a place at the table, not a player: it gets no zones, so
  // nothing can be dropped into a seat that nobody is sitting in.
  const seatRows = useMemo(
    () => table.seats.map((s) => (s.empty ? null : zoneRows(game, "player", s.index + 1))),
    [game, table]
  );
  const seatStyles = useMemo(
    () => table.seats.map((s) => ({
      transform: `translate(-50%, -50%) translate(${s.x}px, ${s.y}px) rotate(${s.angle}deg)`,
    })),
    [table]
  );

  /**
   * Cards per zone. Rebuilt only when the order or the catalogue changes, so
   * rotating one card does not hand every zone a freshly allocated array and
   * defeat the memo on the components below.
   */
  const cardsByZone = useMemo(() => {
    const m: Record<string, CardData[]> = {};
    Object.entries(order).forEach(([zoneId, ids]) => {
      m[zoneId] = ids.length ? ids.map((id) => byId[id]).filter(Boolean) : NO_CARDS;
    });
    return m;
  }, [order, byId]);

  const freeCards = useMemo(
    () => Object.entries(board)
      .filter(([, s]) => s.zone === null)
      .map(([id]) => byId[id])
      .filter(Boolean),
    [board, byId]
  );

  /**
   * All rotation goes through here, from both the toolbar and the two mouse
   * buttons. Deltas rather than absolute angles, and deliberately unbounded:
   * wrapping 0 to 270 would spin the card three quarters the wrong way.
   */
  const rotateBy = useCallback((cardId: string, delta: number) => {
    setBoard((prev) => {
      const cur = prev[cardId];
      if (!cur) return prev;
      return { ...prev, [cardId]: { ...cur, rotation: cur.rotation + delta } };
    });
  }, []);

  const flipCard = useCallback((cardId: string, faceUp: boolean) => {
    setBoard((prev) => {
      const cur = prev[cardId];
      if (!cur) return prev;
      return { ...prev, [cardId]: { ...cur, faceUp } };
    });
  }, []);

  const rotateCcw = useCallback((cardId: string) => rotateBy(cardId, -90), [rotateBy]);

  /**
   * A card was released. Inside a zone it joins that zone's order; anywhere else it
   * becomes free at those canvas coordinates. Nothing hit-tests against other cards,
   * so cards overlap freely.
   */
  const handleDrop = useCallback((cardId: string, target: DropTarget) => {
    setOrder((prev) => {
      const next: Record<string, string[]> = {};
      Object.keys(prev).forEach((z) => { next[z] = prev[z].filter((id) => id !== cardId); });
      if (target.zone) {
        const list = (next[target.zone] = next[target.zone] || []);
        const at = target.index ?? list.length;
        list.splice(Math.max(0, Math.min(at, list.length)), 0, cardId);
      }
      return next;
    });

    setBoard((prev) => {
      const cur = prev[cardId];
      if (!cur) return prev;
      if (target.zone) {
        const { x, y, ...rest } = cur;
        return { ...prev, [cardId]: { ...rest, zone: target.zone } };
      }
      // target.clientX/Y is the card's centre, which is rotation-invariant.
      const pt = playArea.current?.toCanvas(target.clientX, target.clientY)
        ?? { x: target.clientX, y: target.clientY };
      return { ...prev, [cardId]: { ...cur, zone: null, x: pt.x, y: pt.y } };
    });
  }, []);

  /**
   * Change the table. Zones belonging to seats that go away take their cards with
   * them onto the canvas, at exactly the spot they were sitting — measured here,
   * before any of the state changes, while the old layout is still on screen.
   */
  const changeSeating = useCallback((change: { shape?: TableShape; delta?: number }) => {
    const cur = seatingRef.current;
    const shape = change.shape ?? cur.shape;
    const players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, cur.players + (change.delta ?? 0)));
    if (shape === cur.shape && players === cur.players) return;

    const next = reconcileZones(board, order, listZones(game, players), (cardId, zoneId) => {
      // A buried stack card has no element of its own; fall back to its zone.
      const el =
        document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(cardId)}"]`) ??
        document.querySelector<HTMLElement>(`[data-zone="${CSS.escape(zoneId)}"]`);
      if (!el || !playArea.current) return undefined;
      const r = el.getBoundingClientRect();
      return playArea.current.toCanvas(r.left + r.width / 2, r.top + r.height / 2);
    });

    setBoard(next.state);
    setOrder(next.order);
    seatingRef.current = { shape, players };
    setSeating(seatingRef.current);
    const seats = buildTable(shape, players).seats.length;
    setViewSeat((v) => Math.min(v, seats - 1));
  }, [game, board, order]);

  const renderRows = (rows: ZoneRow[], cls: string, keyPrefix = "") =>
    rows.map((row) => (
      <div key={keyPrefix + row.rowName} className={cls}>
        {row.zones.map((zone) => (
          <Zone
            key={zone.id}
            zone={zone}
            cards={cardsByZone[zone.id] ?? NO_CARDS}
            board={board}
            onRotateBy={rotateBy}
            onFlip={flipCard}
          />
        ))}
      </div>
    ));

  const tray = trayRows.length ? (
    <div className="tray">{renderRows(trayRows, "tray-row")}</div>
  ) : null;

  const tableControls = (
    <div className="table-controls">
      <div className="control-group">
        <span className="control-label">Table</span>
        {[TableShape.Square, TableShape.Rectangle].map((shape) => (
          <button
            key={shape}
            className="control-button"
            aria-pressed={seating.shape === shape}
            onClick={() => changeSeating({ shape })}
          >
            {shape === TableShape.Square ? "Square" : "Rect"}
          </button>
        ))}
      </div>

      <div className="control-group">
        <span className="control-label">Players</span>
        <button
          className="control-button"
          aria-label="Remove a player"
          disabled={seating.players <= MIN_PLAYERS}
          onClick={() => changeSeating({ delta: -1 })}
        >
          −
        </button>
        <span className="control-value">{seating.players}</span>
        <button
          className="control-button"
          aria-label="Add a player"
          disabled={seating.players >= MAX_PLAYERS}
          onClick={() => changeSeating({ delta: +1 })}
        >
          +
        </button>
      </div>

      <div className="control-group">
        <span className="control-label">View from</span>
        {table.seats.map((s: Seat) => (
          <button
            key={s.index}
            className="control-button"
            aria-pressed={s.index === viewSeat}
            onClick={() => setViewSeat(s.index)}
            title={s.empty ? `Seat ${s.index + 1} (empty)` : `Player ${s.index + 1}`}
          >
            {s.empty ? "·" : s.index + 1}
          </button>
        ))}
      </div>
    </div>
  );

  const rotation = -(table.seats[viewSeat]?.angle ?? 0);

  return (
    <DragProvider onDrop={handleDrop} onClickCard={rotateCcw} view={view}>
      <PlayArea ref={playArea} rotation={rotation} view={view} overlay={<>{tray}{tableControls}</>}>
        {/* Table surface, purely visual */}
        <div
          className={`table-surface table-${table.shape}`}
          style={{ width: table.width, height: table.height }}
        />

        {/* Centre of the table */}
        <div className="shared-zones">
          {renderRows(sharedRows, "shared-zone-row")}
        </div>

        {/* One seat panel per seat, the same authored zones stamped at each */}
        {table.seats.map((seat) => (
          <div
            key={seat.index}
            className={`seat ${seat.empty ? "seat-empty" : ""}`}
            data-seat={seat.index}
            /* The drag layer reads this to orient the ghost. */
            data-angle={seat.angle}
            style={seatStyles[seat.index]}
          >
            <div className="seat-label">{seat.empty ? `Seat ${seat.index + 1}` : `Player ${seat.index + 1}`}</div>
            {seatRows[seat.index] && renderRows(seatRows[seat.index]!, "player-zone-row", `${seat.index}-`)}
          </div>
        ))}

        {/* Free cards live directly on the canvas */}
        {freeCards.map((card) => {
          const s = board[String(card.id)];
          return (
            <div
              key={card.id}
              className="free-card"
              /* x/y is the card centre, so pull back by half its own size */
              style={{ transform: `translate(-50%, -50%) translate(${s?.x ?? 0}px, ${s?.y ?? 0}px)` }}
            >
              <Card card={card} state={s} onRotateBy={rotateBy} onFlip={flipCard} />
            </div>
          );
        })}
      </PlayArea>
    </DragProvider>
  );
}

export default Page;

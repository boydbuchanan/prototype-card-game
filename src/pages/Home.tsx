"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Zone from "components/Board/Zone";
import Card from "components/Board/Card";
import { PlayArea, PlayAreaHandle } from "components/Board/PlayArea";
import { CardFace, CardZoneType, Position, TableShape } from "enums";
import { DragProvider, DropTarget, ViewState } from "components/Game/drag";
import { buildTable, Seat } from "components/Game/seats";
import {
  convertSize, defaultTableSize, DEFAULT_UNIT, RealUnit, roundSize, TableSize, UNIT_LABEL,
} from "components/Game/units";
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
      OnTable: false,
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

const SHAPE_LABEL: Record<TableShape, string> = {
  [TableShape.Square]: "Square",
  [TableShape.Round]: "Round",
  [TableShape.Rectangle]: "Rect",
};


/**
 * Everything the table controls own. `size` follows the default chart from the
 * shape and player count unless `custom` is set, at which point the designer owns
 * it and adding a player no longer resizes the table.
 */
interface Seating {
  shape: TableShape;
  players: number;
  size: TableSize;
  unit: RealUnit;
  custom: boolean;
}

function seatingFrom(game: GameSetup, players: number): Seating {
  const shape = game.TableShape || TableShape.Square;
  const unit = game.TableUnit ?? DEFAULT_UNIT;
  // An authored TableSize is itself an override.
  const custom = !!game.TableSize;
  return {
    shape, players, unit, custom,
    size: custom ? roundSize(game.TableSize!) : defaultTableSize(shape, players, unit),
  };
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
  const [seating, setSeating] = useState<Seating>(
    () => seatingFrom(game, playerCount(game, scenario))
  );
  // Mirrors `seating` for the handler below, which must see its own previous
  // change: two quick clicks on + land in one React batch, and reading state
  // there would make the second click repeat the first.
  const seatingRef = useRef(seating);

  /**
   * A player with no zones of their own needs no seat — there is nothing to lay
   * out in front of them. A solitaire table is the shared zones and nothing else,
   * so the seats, the seat labels and the view-from control all fall away.
   */
  const hasPlayerAreas = useMemo(() => zoneRows(game, "player", 1).length > 0, [game]);
  const table = useMemo(
    () => buildTable(seating.shape, hasPlayerAreas ? seating.players : 0, seating.size, seating.unit),
    [seating, hasPlayerAreas]
  );

  /** Which seat is brought to the bottom of the screen. A view control, not game state. */
  const [viewSeat, setViewSeat] = useState(0);
  /** Table setup is collapsed by default; only the view control stays out. */
  const [setupOpen, setSetupOpen] = useState(false);
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
    seatingRef.current = seatingFrom(game, players);
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
  /**
   * Each seat's rows, split by whether they occupy table space. On-table rows
   * stack inward from the table edge; off-table rows hang outward in front of
   * the player, taking no room on the surface.
   */
  const seatRows = useMemo(
    () => table.seats.map((s) => {
      const rows = zoneRows(game, "player", s.index + 1);
      return {
        onTable: rows.filter((r) => r.onTable),
        offTable: rows.filter((r) => !r.onTable),
      };
    }),
    [game, table]
  );
  // The seat is a point on the perimeter; the two stacks anchor to it from either side.
  const seatStyles = useMemo(
    () => table.seats.map((s) => ({
      transform: `translate(${s.x}px, ${s.y}px) rotate(${s.angle}deg)`,
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
   * All rotation goes through here, from both mouse buttons. Deltas rather than
   * absolute angles, and deliberately unbounded:
   * wrapping 0 to 270 would spin the card three quarters the wrong way.
   */
  const rotateBy = useCallback((cardId: string, delta: number) => {
    setBoard((prev) => {
      const cur = prev[cardId];
      if (!cur) return prev;
      return { ...prev, [cardId]: { ...cur, rotation: cur.rotation + delta } };
    });
  }, []);

  const toggleFace = useCallback((cardId: string) => {
    setBoard((prev) => {
      const cur = prev[cardId];
      if (!cur) return prev;
      return { ...prev, [cardId]: { ...cur, faceUp: !cur.faceUp } };
    });
  }, []);

  /** Plain click turns the card; Ctrl/Cmd + click flips it. */
  const clickCard = useCallback(
    (cardId: string, mods: { ctrlKey: boolean; metaKey: boolean }) => {
      if (mods.ctrlKey || mods.metaKey) toggleFace(cardId);
      else rotateBy(cardId, -90);
    },
    [rotateBy, toggleFace]
  );

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
  const changeSeating = useCallback((change: {
    shape?: TableShape; delta?: number; size?: Partial<TableSize>;
    unit?: RealUnit; custom?: boolean;
  }) => {
    const cur = seatingRef.current;
    const shape = change.shape ?? cur.shape;
    const unit = change.unit ?? cur.unit;
    const custom = change.custom ?? cur.custom;
    // No upper bound: the table no longer grows to accommodate players beyond the
    // chart, so a crowded table is a real answer rather than something to prevent.
    const players = Math.max(MIN_PLAYERS, cur.players + (change.delta ?? 0));

    const size: TableSize =
      // Typing a size implies the override, and keeps what was typed.
      change.size ? roundSize({ ...cur.size, ...change.size })
      // Switching unit restates the same table; the physical size never changes.
      : change.unit ? convertSize(cur.size, cur.unit, change.unit)
      // Turning the override off hands the size back to the chart.
      : custom ? cur.size
      : defaultTableSize(shape, players, unit);

    const same = shape === cur.shape && players === cur.players && unit === cur.unit
      && custom === cur.custom
      && size.width === cur.size.width && size.height === cur.size.height;
    if (same) return;

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
    seatingRef.current = { shape, players, size, unit, custom };
    setSeating(seatingRef.current);
    const seats = buildTable(shape, players, size, unit).seats.length;
    setViewSeat((v) => Math.max(0, Math.min(v, seats - 1)));
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
          />
        ))}
      </div>
    ));

  const tray = trayRows.length ? (
    <div className="tray">{renderRows(trayRows, "tray-row")}</div>
  ) : null;

  const isRound = seating.shape === TableShape.Round;

  const sizeInput = (axis: "width" | "height", label: string) => (
    <input
      className="control-number"
      type="number"
      min={1}
      step={1}
      aria-label={label}
      value={seating.size[axis]}
      onChange={(e) => {
        const v = Math.round(Number(e.target.value));
        if (!Number.isFinite(v) || v < 1) return;
        // A round table is one measurement: its diameter drives both axes.
        changeSeating({ size: isRound ? { width: v, height: v } : { [axis]: v } });
      }}
    />
  );

  /**
   * Setting up the table is a rare act; changing whose seat you are looking from
   * is not. So the setup collapses and the view stays out.
   */
  const tableSetup = (
    <div className="control-panel">
      <div className="control-group">
        <span className="control-label">Table</span>
        {[TableShape.Square, TableShape.Round, TableShape.Rectangle].map((shape) => (
          <button
            key={shape}
            className="control-button"
            aria-pressed={seating.shape === shape}
            onClick={() => changeSeating({ shape })}
          >
            {SHAPE_LABEL[shape]}
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
        <button className="control-button" aria-label="Add a player" onClick={() => changeSeating({ delta: +1 })}>
          +
        </button>
      </div>

      <div className="control-group">
        <label className="control-check">
          <input
            type="checkbox"
            checked={seating.custom}
            onChange={(e) => changeSeating({ custom: e.target.checked })}
          />
          Custom size
        </label>
        {seating.custom ? (
          <>
            {(["in", "cm"] as RealUnit[]).map((u) => (
              <button
                key={u}
                className="control-button"
                aria-pressed={seating.unit === u}
                title={`Author the table in ${u === "in" ? "inches" : "centimetres"}`}
                onClick={() => changeSeating({ unit: u })}
              >
                {UNIT_LABEL[u]}
              </button>
            ))}
            {sizeInput("width", isRound ? `Diameter in ${seating.unit}` : `Table width in ${seating.unit}`)}
            {!isRound && (
              <>
                <span className="control-times">×</span>
                {sizeInput("height", `Table length in ${seating.unit}`)}
              </>
            )}
          </>
        ) : (
          <span className="control-note">
            {isRound
              ? `⌀${seating.size.width} ${seating.unit}`
              : `${seating.size.width} × ${seating.size.height} ${seating.unit}`}
          </span>
        )}
      </div>
    </div>
  );

  const tableControls = (
    <div className="table-controls">
      {setupOpen && tableSetup}
      <div className="control-bar">
        <button
          className="control-button control-disclosure"
          aria-expanded={setupOpen}
          onClick={() => setSetupOpen((v) => !v)}
        >
          {setupOpen ? "▾" : "▸"} Table
        </button>
        {table.seats.length > 0 && (
          <div className="control-group">
            <span className="control-label">View from</span>
            {table.seats.map((s: Seat) => (
              <button
                key={s.index}
                className="control-button"
                aria-pressed={s.index === viewSeat}
                onClick={() => setViewSeat(s.index)}
                title={`Player ${s.index + 1}`}
              >
                {s.index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const rotation = -(table.seats[viewSeat]?.angle ?? 0);
  // Stable identity, so PlayArea only re-fits when the table really changes size.
  const tableFootprint = useMemo(
    () => ({ width: table.width, height: table.height }),
    [table.width, table.height]
  );

  return (
    <DragProvider onDrop={handleDrop} onClickCard={clickCard} view={view}>
      <PlayArea
        ref={playArea}
        rotation={rotation}
        view={view}
        content={tableFootprint}
        overlay={<>{tray}{tableControls}</>}
      >
        {/* Table surface, purely visual */}
        <div
          className={`table-surface table-${table.shape}`}
          data-shape={table.shape}
          style={{ width: table.width, height: table.height }}
        />

        {/* Centre of the table */}
        <div className="shared-zones">
          {renderRows(sharedRows, "shared-zone-row")}
        </div>

        {table.seats.map((seat) => (
          <div
            key={seat.index}
            className="seat"
            data-seat={seat.index}
            /* The drag layer reads this to orient the ghost. */
            data-angle={seat.angle}
            style={seatStyles[seat.index]}
          >
            <div className="seat-on-table">
              {renderRows(seatRows[seat.index].onTable, "player-zone-row", `${seat.index}-on-`)}
            </div>
            <div className="seat-off-table">
              {renderRows(seatRows[seat.index].offTable, "player-zone-row", `${seat.index}-off-`)}
              <div className="seat-label">Player {seat.index + 1}</div>
            </div>
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
              <Card card={card} state={s} onRotateBy={rotateBy} />
            </div>
          );
        })}
      </PlayArea>
    </DragProvider>
  );
}

export default Page;

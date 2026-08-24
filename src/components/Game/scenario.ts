import { BoardState, CardData, CardState, GameSetup, Placement, RowSetup, Scenario } from "types";
import { CardFace, CardZoneType, Position } from "enums";

/**
 * Zone ids are asymmetric by construction: shared zones are namespaced by their row,
 * player zones by their player number. Everything else in the app addresses zones by
 * the id these produce — and every one of them comes from `zoneRows` below, so there
 * is exactly one place where the naming rule lives.
 */
export function sharedZoneId(rowName: string, zoneName: string) {
  return `${rowName}-${zoneName}`;
}

/** Tray zones are screen-fixed and shared, so they need no row or player namespace. */
export function trayZoneId(zoneName: string) {
  return `Tray-${zoneName}`;
}
export function playerZoneId(zoneName: string, player: number) {
  return `${zoneName}-${player}`;
}

/** A placement names a zone; `player` decides which of the two forms it is. */
function resolveZone(zone: string, player?: number) {
  return player ? playerZoneId(zone, player) : zone;
}

export type ZoneScope = "shared" | "tray" | "player";

export interface ZoneInfo {
  id: string;
  /** Authored zone name, used as the zone's label. */
  name: string;
  scope: ZoneScope;
  /** 1-based seat number for player zones, undefined otherwise. */
  player?: number;
  type: CardZoneType;
  display: CardFace;
  textPosition: Position;
  isFree: boolean;
}

export interface ZoneRow {
  rowName: string;
  zones: ZoneInfo[];
  onTable: boolean;
}

function zoneIdFor(scope: ZoneScope, rowName: string, zoneName: string, player?: number) {
  if (scope === "tray") return trayZoneId(zoneName);
  if (scope === "player") return playerZoneId(zoneName, player ?? 1);
  return sharedZoneId(rowName, zoneName);
}

function rowsFor(game: GameSetup, scope: ZoneScope): RowSetup[] {
  if (scope === "shared") return game.SharedZones ?? [];
  if (scope === "tray") return game.TrayZones ?? [];
  return game.PlayerZones ?? [];
}

/**
 * The zones of one scope, grouped into the rows they were authored in. Player
 * zones are stamped for a single seat, since the same authored rows are repeated
 * at every seat. This is the only function that mints a zone id.
 */
export function zoneRows(game: GameSetup, scope: ZoneScope, player?: number): ZoneRow[] {
  return rowsFor(game, scope).map((row) => ({
    rowName: row.RowName,
    onTable: row.OnTable ?? true,
    zones: row.Zones.map((z) => ({
      id: zoneIdFor(scope, row.RowName, z.Name, player),
      name: z.Name,
      scope,
      player: scope === "player" ? player : undefined,
      type: z.ZoneType,
      display: z.CardDisplay,
      textPosition: z.TextPosition ?? Position.Left,
      isFree: false,
    })),
  }));
}

/**
 * Seats in play. A scenario overrides the setup, and the table controls override
 * both — the count is a live value, not a fixed property of the setup.
 */
export function playerCount(game: GameSetup, scenario?: Scenario | null): number {
  return scenario?.players ?? game.Players ?? 1;
}

/** Every zone the setup renders for `players` seats, in render order. */
export function listZones(game: GameSetup, players = playerCount(game)): ZoneInfo[] {
  const zones: ZoneInfo[] = [];
  const push = (rows: ZoneRow[]) => rows.forEach((r) => zones.push(...r.zones));

  push(zoneRows(game, "shared"));
  push(zoneRows(game, "tray"));
  for (let p = 1; p <= Math.max(1, players); p++) push(zoneRows(game, "player", p));
  return zones;
}

function faceUpFor(display?: CardFace) {
  return display !== CardFace.FaceDown;
}

/**
 * Per-card state from a card list and a scenario.
 * Resolution order per card: an explicit placement, then a byType default,
 * then the scenario-wide default, then the first zone in the setup.
 */
function buildBoardState(
  cards: CardData[],
  game: GameSetup,
  scenario: Scenario | null,
  players: number
): BoardState {
  const zones = listZones(game, players);
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const fallbackZone = zones[0]?.id ?? "";

  const placements = new Map<string, Placement>();
  scenario?.placements?.forEach((p) => placements.set(String(p.id), p));
  const byType = scenario?.defaults?.byType ?? {};
  const globalDefault = scenario?.defaults;

  const state: BoardState = {};

  cards.forEach((card) => {
    const explicit = placements.get(String(card.id));
    const typeRule = byType[card.cardType];

    const zone =
      (explicit && resolveZone(explicit.zone, explicit.player)) ??
      (typeRule && resolveZone(typeRule.zone, typeRule.player)) ??
      (globalDefault?.zone && resolveZone(globalDefault.zone, globalDefault.player)) ??
      fallbackZone;

    const resolvedZone = zoneById.has(zone) ? zone : fallbackZone;

    const faceUp =
      explicit?.faceUp ??
      typeRule?.faceUp ??
      globalDefault?.faceUp ??
      faceUpFor(zoneById.get(resolvedZone)?.display);

    const rotation =
      explicit?.rotation ?? typeRule?.rotation ?? globalDefault?.rotation ?? 0;

    // An explicit placement naming no zone means "free on the canvas".
    const free = explicit && explicit.zone === "";
    const entry: CardState = { zone: free ? null : resolvedZone, rotation, faceUp };
    const x = explicit?.x ?? typeRule?.x;
    const y = explicit?.y ?? typeRule?.y;
    if (x != null) entry.x = x;
    if (y != null) entry.y = y;

    state[String(card.id)] = entry;
  });

  return state;
}

export interface Board {
  state: BoardState;
  /** Zone id to the ids of the cards in it, in the order they sit. */
  order: Record<string, string[]>;
}

/**
 * The complete starting board. State and order are built together so they cannot
 * drift: a scenario written by `toScenario` lists its placements in zone order,
 * and replaying that order here is what makes a saved board reload as it was left.
 */
export function buildBoard(
  cards: CardData[],
  game: GameSetup,
  scenario: Scenario | null,
  players = playerCount(game, scenario)
): Board {
  const state = buildBoardState(cards, game, scenario, players);

  const order: Record<string, string[]> = {};
  listZones(game, players).forEach((z) => { order[z.id] = []; });

  const seated = new Set<string>();
  const seat = (id: string) => {
    const zone = state[id]?.zone;
    if (!zone || seated.has(id) || !order[zone]) return;
    order[zone].push(id);
    seated.add(id);
  };

  scenario?.placements?.forEach((p) => seat(String(p.id)));
  // Cards the scenario never mentioned fall in behind, in catalogue order.
  cards.forEach((c) => seat(String(c.id)));

  return { state, order };
}

/**
 * Serialise the current board back out as a scenario. Round-trips through
 * `buildBoard`, so a saved game reloads exactly as it was left, ordering included.
 */
export function toScenario(
  state: BoardState,
  order: Record<string, string[]>,
  players: number,
  name = "Saved board"
): Scenario {
  const placements: Placement[] = [];
  Object.entries(order).forEach(([zoneId, ids]) => {
    ids.forEach((id) => {
      const s = state[id];
      if (!s) return;
      const p: Placement = { id, zone: zoneId, rotation: s.rotation, faceUp: s.faceUp };
      if (s.x != null) p.x = s.x;
      if (s.y != null) p.y = s.y;
      placements.push(p);
    });
  });
  // Free cards are in state but in no zone list, so sweep them up separately.
  Object.entries(state).forEach(([id, s]) => {
    if (s.zone !== null) return;
    const p: Placement = { id, zone: "", rotation: s.rotation, faceUp: s.faceUp };
    if (s.x != null) p.x = s.x;
    if (s.y != null) p.y = s.y;
    placements.push(p);
  });
  return {
    schema: "cardgame.scenario/v1",
    name,
    players,
    placements,
  };
}

/**
 * Fit the board to a new set of zones. Cards in a zone that no longer exists —
 * a seat removed from the table — become free on the canvas rather than
 * vanishing, and `positionOf` decides where: normally exactly where they sat.
 */
export function reconcileZones(
  board: BoardState,
  order: Record<string, string[]>,
  zones: ZoneInfo[],
  positionOf: (cardId: string, zoneId: string) => { x: number; y: number } | undefined
): Board {
  const live = new Set(zones.map((z) => z.id));

  const nextOrder: Record<string, string[]> = {};
  zones.forEach((z) => { nextOrder[z.id] = order[z.id] ? [...order[z.id]] : []; });

  const state: BoardState = { ...board };
  Object.entries(order).forEach(([zoneId, ids]) => {
    if (live.has(zoneId)) return;
    ids.forEach((id) => {
      const cur = state[id];
      if (!cur) return;
      const at = positionOf(id, zoneId) ?? { x: cur.x ?? 0, y: cur.y ?? 0 };
      state[id] = { ...cur, zone: null, x: at.x, y: at.y };
    });
  });

  return { state, order: nextOrder };
}

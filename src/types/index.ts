
import { CardFace, CardZoneType, Position, TableShape } from "enums";
import { RealUnit, TableSize } from "components/Game/units";

// Define the CardData type.
// A card is identity plus arbitrary columns from cards.csv; card templates read
// those by name via a region's `column`. Presentation lives in the template, not here.
export interface CardData {
  id: string;
  cardName: string;
  cardType: string;
  [column: string]: unknown;
}

export interface GameSetup {
  Players: number;
  /** Table outline, and with it how seats distribute around the edges. */
  TableShape?: TableShape,
  /** Table footprint in TableUnit. `width` is the diameter when Round. */
  TableSize?: TableSize,
  /** Unit the table is authored in. Inches on CM */
  TableUnit?: RealUnit,
  /** Centre of the table. */
  SharedZones: RowSetup[],
  /** Authored once, stamped at every seat. */
  PlayerZones: RowSetup[],
  /** Fixed to the screen: never pans, zooms or rotates. */
  TrayZones?: RowSetup[],
}
export interface RowSetup {
  RowName: string,
  Zones: ZoneSetup[],
  OnTable?: boolean,
}
export interface ZoneSetup {
  Name: string;
  CardDisplay: CardFace;
  ZoneType: CardZoneType;
  TextPosition?: Position;
}

/* ---------- Board state (cardgame.scenario/v1) ---------- */

/**
 * The playable state of one card, kept separately from its definition.
 * Rotation lives here rather than inside the Card component, so it survives a
 * card moving between zones and can be saved.
 */
export interface CardState {
  /**
   * Rendered zone id, e.g. "Shared-Deck" or "Hand-1".
   * `null` means the card sits free on the canvas at `x`/`y`.
   */
  zone: string | null;
  /** Degrees. Any multiple of 90. */
  rotation: number;
  faceUp: boolean;
  /** Canvas coordinates. Authoritative only when `zone` is null. */
  x?: number;
  y?: number;
}

/** Keyed by card id. */
export type BoardState = Record<string, CardState>;

/** Where a card starts, and how. Overrides any `byType` default. */
export interface Placement {
  id: string;
  /** Shared zone id, or a player zone's bare Name when `player` is set. */
  zone: string;
  player?: number;
  rotation?: number;
  faceUp?: boolean;
  x?: number;
  y?: number;
}

export interface ScenarioDefaults {
  /** Catch-all for cards no rule places. */
  zone?: string;
  player?: number;
  faceUp?: boolean;
  rotation?: number;
  /** Keyed by cardType. */
  byType?: Record<string, Omit<Placement, "id">>;
}

/**
 * Initial setup, save file, and scenario definition — one shape.
 * Resolution order: placements → defaults.byType → defaults → first shared zone.
 */
export interface Scenario {
  schema?: string;
  name?: string;
  players?: number;
  defaults?: ScenarioDefaults;
  placements?: Placement[];
}

/* ---------- Card templates (cardgame.templates/v1) ---------- */

export type RegionRotation = 0 | 90 | 180 | 270;
export type RegionAlign = "start" | "center" | "end";

/** Everything a region can be styled with. Set in `styles`, inline, or on the region. */
export interface RegionStyle {
  /** A CSS colour or gradient, or the URL of an image (`.svg` included). */
  bg?: string;
  color?: string;
  /** px at the template's base card size; scales with the card. */
  size?: number;
  weight?: number;
  align?: RegionAlign;
}

export interface Region extends RegionStyle {
  /** [x, y, w, h] as a percentage of the card. */
  rect: [number, number, number, number];
  rotate?: RegionRotation;
  /** Column of cards.csv to draw as text. Omit for a background-only region. */
  column?: string;
  /** A name from `styles`, or an object defining one inline. */
  style?: string | RegionStyle;
}

export interface CardTemplate {
  /** The card's background image: a URL, or a CSS colour or gradient. */
  frame?: string;
  regions: Region[];
}

export interface CardTemplates {
  schema?: string;
  card: { width: number; height: number; radius?: number };
  styles?: Record<string, RegionStyle>;
  /** Keyed by cardType. */
  templates: Record<string, CardTemplate>;
}

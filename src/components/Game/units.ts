import { TableShape } from "enums";

/**
 * A card is authored in pixels and always renders at those pixels — it never
 * scales, and switching the table's unit does not touch it. Only the *table* is
 * given a real size, and it is converted to pixels here. Choosing the card's
 * pixel size is therefore what sets how large a real table looks beside it.
 */
export type RealUnit = "in" | "cm";

const CM_PER_IN = 2.54;

/** One inch is 100px. A centimetre is the same physical distance, so it follows. */
export const PX_PER_UNIT: Record<RealUnit, number> = {
  in: 100,
  cm: 100 / CM_PER_IN,
};

export const DEFAULT_UNIT: RealUnit = "cm";

export const UNIT_LABEL: Record<RealUnit, string> = { in: "in", cm: "cm" };

export function toPx(value: number, unit: RealUnit = DEFAULT_UNIT): number {
  return value * PX_PER_UNIT[unit];
}

/** Same physical size, different unit — so switching units never resizes the table. */
export function convertUnit(value: number, from: RealUnit, to: RealUnit): number {
  if (from === to) return value;
  return from === "in" ? value * CM_PER_IN : value / CM_PER_IN;
}

export interface TableSize {
  /** Diameter for a round table. */
  width: number;
  height: number;
}

/** Whole units only: a table is a rough measurement, and cm is there for precision. */
export function roundSize(size: TableSize): TableSize {
  return { width: Math.max(1, Math.round(size.width)), height: Math.max(1, Math.round(size.height)) };
}

export function convertSize(size: TableSize, from: RealUnit, to: RealUnit): TableSize {
  return roundSize({
    width: convertUnit(size.width, from, to),
    height: convertUnit(size.height, from, to),
  });
}

/**
 * The default size chart: real dining tables, in centimetres, by shape and seat
 * count. Rectangles are landscape — length first, then depth — so their long
 * sides are the top and bottom edges.
 * Source: rayon.design space planning guide, dining room dimensions.
 *
 * Picking a shape and a player count is enough to get a sensible table; the chart
 * is stepped through as players are added. A designer who wants a specific table
 * overrides the size instead.
 */
export const TABLE_CHART: Record<TableShape, { seats: number; size: TableSize }[]> = {
  [TableShape.Square]: [
    { seats: 2, size: { width: 76, height: 76 } },
    { seats: 4, size: { width: 90, height: 90 } },
    { seats: 8, size: { width: 150, height: 150 } },
  ],
  [TableShape.Round]: [
    { seats: 2, size: { width: 75, height: 75 } },
    { seats: 4, size: { width: 120, height: 120 } },
    { seats: 6, size: { width: 150, height: 150 } },
  ],
  [TableShape.Rectangle]: [
    { seats: 2, size: { width: 100, height: 76 } },
    { seats: 6, size: { width: 150, height: 90 } },
    { seats: 8, size: { width: 200, height: 90 } },
  ],
};

/** A place setting along a table edge, derived from the chart: 3.50m / 5 a side. */
export const PLACE_SETTING_CM = 70;

/**
 * The table for a shape and a player count. Steps up through the chart, and past
 * its largest entry keeps growing the way the chart does — longer but no deeper
 * for a rectangle, wider all round for a square, a bigger circle for a round
 * table. Whole units, in the unit asked for.
 */
export function defaultTableSize(
  shape: TableShape,
  players: number,
  unit: RealUnit = DEFAULT_UNIT
): TableSize {
  const n = Math.max(1, players);
  const chart = TABLE_CHART[shape];
  const listed = chart.find((entry) => n <= entry.seats);
  if (listed) return convertSize(listed.size, "cm", unit);

  const largest = chart[chart.length - 1];
  const extra = n - largest.seats;
  let grown: TableSize;
  if (shape === TableShape.Square) {
    const side = largest.size.width + Math.ceil(extra / 4) * PLACE_SETTING_CM;
    grown = { width: side, height: side };
  } else if (shape === TableShape.Round) {
    const d = largest.size.width + (extra * PLACE_SETTING_CM) / Math.PI;
    grown = { width: d, height: d };
  } else {
    // Both ends are already seated, so every extra seat joins a long side.
    grown = {
      width: largest.size.width + Math.ceil(extra / 2) * PLACE_SETTING_CM,
      height: largest.size.height,
    };
  }
  return convertSize(grown, "cm", unit);
}

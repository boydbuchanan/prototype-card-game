import { describe, expect, test } from "vitest";
import { TableShape } from "enums";
import { buildTable, distribute, spread, SeatSide } from "./seats";
import { convertSize, defaultTableSize, PX_PER_UNIT, TABLE_CHART, toPx } from "./units";

/** Seat counts per edge, read back off a built table. */
function bySide(shape: TableShape, players: number, size = { width: 200, height: 90 }) {
  const counts: Record<string, number> = { bottom: 0, top: 0, left: 0, right: 0 };
  buildTable(shape, players, size).seats.forEach((s) => { counts[s.side!]++; });
  return counts;
}

describe("spread", () => {
  test("places seats at the fractions real place settings fall on", () => {
    expect(spread(1, 100)).toEqual([0]);              // 50%
    expect(spread(2, 100)).toEqual([-25, 25]);        // 25% and 75%
    expect(spread(4, 100)).toEqual([-37.5, -12.5, 12.5, 37.5]);
  });

  test("is empty for no seats", () => {
    expect(spread(0, 100)).toEqual([]);
  });
});

describe("square seating", () => {
  // The reported bug: five players used to sit 2 bottom, 2 left, 1 top and leave
  // the right side empty, because each edge was filled before the next was begun.
  test("five players put nobody on an empty side", () => {
    expect(bySide(TableShape.Square, 5)).toEqual({ bottom: 2, top: 1, left: 1, right: 1 });
  });

  test("fills one per side before doubling up", () => {
    expect(bySide(TableShape.Square, 1)).toEqual({ bottom: 1, top: 0, left: 0, right: 0 });
    // Two players face each other rather than sitting round a corner.
    expect(bySide(TableShape.Square, 2)).toEqual({ bottom: 1, top: 1, left: 0, right: 0 });
    expect(bySide(TableShape.Square, 3)).toEqual({ bottom: 1, top: 1, left: 1, right: 0 });
    expect(bySide(TableShape.Square, 4)).toEqual({ bottom: 1, top: 1, left: 1, right: 1 });
    expect(bySide(TableShape.Square, 8)).toEqual({ bottom: 2, top: 2, left: 2, right: 2 });
  });

  test("never leaves an edge two or more seats behind another", () => {
    for (let n = 1; n <= 40; n++) {
      const c = Object.values(bySide(TableShape.Square, n));
      expect(Math.max(...c) - Math.min(...c)).toBeLessThanOrEqual(1);
      expect(c.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe("rectangle seating", () => {
  // People fill a long table's sides before they take an end.
  test("the first four sit two and two, across from each other", () => {
    expect(bySide(TableShape.Rectangle, 1)).toEqual({ bottom: 1, top: 0, left: 0, right: 0 });
    expect(bySide(TableShape.Rectangle, 2)).toEqual({ bottom: 1, top: 1, left: 0, right: 0 });
    expect(bySide(TableShape.Rectangle, 3)).toEqual({ bottom: 2, top: 1, left: 0, right: 0 });
    expect(bySide(TableShape.Rectangle, 4)).toEqual({ bottom: 2, top: 2, left: 0, right: 0 });
  });

  test("nobody takes an end until the long sides hold two each", () => {
    for (let n = 1; n <= 4; n++) {
      const c = bySide(TableShape.Rectangle, n);
      expect(c.left + c.right).toBe(0);
    }
  });

  test("the fifth and sixth players take the ends", () => {
    expect(bySide(TableShape.Rectangle, 5)).toEqual({ bottom: 2, top: 2, left: 1, right: 0 });
    expect(bySide(TableShape.Rectangle, 6)).toEqual({ bottom: 2, top: 2, left: 1, right: 1 });
  });

  test("the seventh and eighth make it three a side", () => {
    expect(bySide(TableShape.Rectangle, 7)).toEqual({ bottom: 3, top: 2, left: 1, right: 1 });
    expect(bySide(TableShape.Rectangle, 8)).toEqual({ bottom: 3, top: 3, left: 1, right: 1 });
  });

  test("the ends never take a second seat", () => {
    for (let n = 1; n <= 30; n++) {
      const c = bySide(TableShape.Rectangle, n);
      expect(c.left).toBeLessThanOrEqual(1);
      expect(c.right).toBeLessThanOrEqual(1);
    }
  });

  test("the long sides are whichever edges are actually longer", () => {
    // Authored portrait, so the long sides are left and right instead.
    const portrait = bySide(TableShape.Rectangle, 4, { width: 90, height: 200 });
    expect(portrait).toEqual({ bottom: 0, top: 0, left: 2, right: 2 });
  });
});

describe("seat geometry", () => {
  test("seats sit on the table perimeter, not outside it", () => {
    const size = { width: 80, height: 40 };
    const { seats, width, height } = buildTable(TableShape.Rectangle, 8, size);
    seats.forEach((s) => {
      const onVertical = Math.abs(Math.abs(s.x) - width / 2) < 0.02;
      const onHorizontal = Math.abs(Math.abs(s.y) - height / 2) < 0.02;
      expect(onVertical || onHorizontal).toBe(true);
    });
  });

  test("each edge is spread by its own length", () => {
    // A long, shallow table: the sides run 80 and the ends are 40 across.
    const { seats } = buildTable(TableShape.Rectangle, 6, { width: 80, height: 40 });
    // Coordinates are tidied to a hundredth of a pixel, so compare at that precision.
    const bottom = seats.filter((s) => s.side === "bottom").map((s) => s.x);
    expect(bottom[0]).toBeCloseTo(toPx(-20), 2);        // 25% of 80
    expect(bottom[1]).toBeCloseTo(toPx(20), 2);         // 75% of 80
    const left = seats.filter((s) => s.side === "left").map((s) => s.y);
    expect(left).toEqual([0]);                           // 50% of 40
  });

  test("seat angles face the table from their edge", () => {
    const { seats } = buildTable(TableShape.Square, 4, { width: 60, height: 60 });
    const angleOf = (side: SeatSide) => seats.find((s) => s.side === side)!.angle;
    expect(angleOf("bottom")).toBe(0);
    expect(angleOf("top")).toBe(180);
    expect(angleOf("left")).toBe(90);
    expect(angleOf("right")).toBe(270);
  });
});

describe("round seating", () => {
  test("six seats sit 60 degrees apart at the radius, first at the bottom", () => {
    const d = 60;
    const { seats } = buildTable(TableShape.Round, 6, { width: d, height: d });
    const r = toPx(d) / 2;
    expect(seats).toHaveLength(6);
    // Coordinates are rounded to a hundredth of a pixel to keep float dust out of
    // the DOM, so the radius holds to that precision rather than exactly.
    seats.forEach((s) => {
      expect(Math.abs(Math.hypot(s.x, s.y) - r)).toBeLessThan(0.02);
    });
    expect(seats[0].x).toBe(0);
    expect(seats[0].y).toBeCloseTo(r, 2);   // bottom of the table
    expect(seats[0].angle).toBe(0);
    expect(seats.map((s) => s.angle)).toEqual([0, -60, -120, -180, -240, -300]);
  });

  test("coordinates carry no float dust", () => {
    // sin(pi) is 1.2e-16; untidied it reaches the DOM as translate(2.1e-13px, ...).
    buildTable(TableShape.Round, 6, { width: 60, height: 60 }).seats.forEach((s) => {
      expect(String(s.x)).not.toMatch(/e-/);
      expect(String(s.y)).not.toMatch(/e-/);
    });
  });

  test("a round table has no sides", () => {
    buildTable(TableShape.Round, 4, { width: 40, height: 40 })
      .seats.forEach((s) => expect(s.side).toBeUndefined());
  });
});

describe("table size", () => {
  test("the footprint is the authored size, never derived from the seats", () => {
    const size = { width: 35.4, height: 35.4 };
    const four = buildTable(TableShape.Square, 4, size);
    const twenty = buildTable(TableShape.Square, 20, size);
    expect(four.width).toBe(toPx(35.4));
    expect(twenty.width).toBe(four.width);
    expect(twenty.height).toBe(four.height);
  });

  test("the same physical table is the same size in either unit", () => {
    // 60in is 152.4cm. Sizes are authored in whole units, so the cm reading lands
    // within half a centimetre of the inch one — the rounding, not a scale error.
    const inches = buildTable(TableShape.Square, 4, { width: 60, height: 60 }, "in");
    const cm = buildTable(TableShape.Square, 4, { width: 152, height: 152 }, "cm");
    expect(Math.abs(cm.width - inches.width)).toBeLessThan(PX_PER_UNIT.cm / 2);
  });

  test("cm is the finer unit, so it round-trips through inches with loss", () => {
    // Stated plainly: inches are coarse on purpose. Reach for cm when it matters.
    expect(convertSize({ width: 61, height: 61 }, "cm", "in")).toEqual({ width: 24, height: 24 });
    expect(convertSize({ width: 24, height: 24 }, "in", "cm")).toEqual({ width: 61, height: 61 });
  });

  test("converting a size between units preserves the physical table", () => {
    const asCm = convertSize({ width: 60, height: 60 }, "in", "cm");
    expect(asCm).toEqual({ width: 152, height: 152 });
    expect(convertSize(asCm, "cm", "in")).toEqual({ width: 60, height: 60 });
  });

  test("distribute totals the player count for every shape", () => {
    [TableShape.Square, TableShape.Rectangle].forEach((shape) => {
      for (let n = 0; n <= 20; n++) {
        const total = Object.values(distribute(shape, n)).reduce((a, b) => a + b, 0);
        expect(total).toBe(n);
      }
    });
  });
});

describe("defaultTableSize", () => {
  test("returns the charted table for each shape and seat count", () => {
    (Object.keys(TABLE_CHART) as TableShape[]).forEach((shape) => {
      TABLE_CHART[shape].forEach(({ seats, size }) => {
        expect(defaultTableSize(shape, seats)).toEqual(size);
      });
    });
  });

  test("steps up to the next charted table as players are added", () => {
    // A square seats 2 at 30in and 4 at 35in, so 3 players get the 4-seat table.
    expect(defaultTableSize(TableShape.Square, 1)).toEqual({ width: 76, height: 76 });
    expect(defaultTableSize(TableShape.Square, 3)).toEqual({ width: 90, height: 90 });
    expect(defaultTableSize(TableShape.Square, 5)).toEqual({ width: 150, height: 150 });
  });

  test("never shrinks as players are added", () => {
    (Object.keys(TABLE_CHART) as TableShape[]).forEach((shape) => {
      let prev = 0;
      for (let n = 1; n <= 30; n++) {
        const s = defaultTableSize(shape, n);
        const area = s.width * s.height;
        expect(area).toBeGreaterThanOrEqual(prev);
        prev = area;
      }
    });
  });

  test("past the chart a rectangle grows longer, not deeper", () => {
    const rect = TABLE_CHART[TableShape.Rectangle];
    const largest = rect[rect.length - 1];
    const bigger = defaultTableSize(TableShape.Rectangle, largest.seats + 4);
    expect(bigger.height).toBe(largest.size.height);        // depth is unchanged
    expect(bigger.width).toBeGreaterThan(largest.size.width); // it just gets longer
  });

  test("returns whole units, and honours the unit asked for", () => {
    const cm = defaultTableSize(TableShape.Square, 4, "cm");
    const inches = defaultTableSize(TableShape.Square, 4, "in");
    expect(Number.isInteger(inches.width) && Number.isInteger(inches.height)).toBe(true);
    expect(inches.width).toBe(convertSize(cm, "cm", "in").width);
  });

  test("a charted table seats its players", () => {
    for (const shape of [TableShape.Square, TableShape.Round, TableShape.Rectangle]) {
      for (const n of [1, 2, 4, 6, 8, 12, 14, 20]) {
        const { seats } = buildTable(shape, n, defaultTableSize(shape, n));
        expect(seats).toHaveLength(n);
      }
    }
  });
});

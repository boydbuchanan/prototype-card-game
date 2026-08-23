import { describe, expect, test } from "vitest";
import { buildBoard, listZones, playerCount, reconcileZones, toScenario, zoneRows } from "./scenario";
import { CardFace, CardZoneType, Position, TableShape } from "enums";
import { CardData, GameSetup } from "types";

const game: GameSetup = {
  Players: 2,
  TableShape: TableShape.Square,
  SharedZones: [{
    RowName: "Shared",
    Zones: [
      { Name: "Deck", CardDisplay: CardFace.FaceDown, ZoneType: CardZoneType.Stack, TextPosition: Position.Top },
    ],
  }],
  PlayerZones: [{
    RowName: "Player",
    Zones: [
      { Name: "Hand", CardDisplay: CardFace.Both, ZoneType: CardZoneType.Row, TextPosition: Position.Left },
    ],
  }],
  TrayZones: [],
};

const cards: CardData[] = [1, 2, 3, 4].map((n) => ({
  id: String(n),
  cardName: `Card ${n}`,
  cardType: "Action",
}));

describe("zone ids", () => {
  test("listZones and zoneRows mint the same ids", () => {
    const fromRows = [
      ...zoneRows(game, "shared").flatMap((r) => r.zones),
      ...zoneRows(game, "tray").flatMap((r) => r.zones),
      ...zoneRows(game, "player", 1).flatMap((r) => r.zones),
      ...zoneRows(game, "player", 2).flatMap((r) => r.zones),
    ].map((z) => z.id);
    expect(listZones(game).map((z) => z.id)).toEqual(fromRows);
    expect(fromRows).toEqual(["Shared-Deck", "Hand-1", "Hand-2"]);
  });
});

describe("buildBoard", () => {
  test("with no scenario, every card lands in the first zone in catalogue order", () => {
    const { state, order } = buildBoard(cards, game, null);
    expect(order["Shared-Deck"]).toEqual(["1", "2", "3", "4"]);
    expect(state["1"].zone).toBe("Shared-Deck");
    // The Deck zone is face down, so cards inherit that.
    expect(state["1"].faceUp).toBe(false);
  });
});

describe("save / reload round trip", () => {
  test("within-zone order survives toScenario -> buildBoard", () => {
    const built = buildBoard(cards, game, null);

    // Shuffle a zone the way a drag would, and move one card to another zone.
    const order = { ...built.order, "Shared-Deck": ["3", "1", "4"], "Hand-1": ["2"] };
    const state = { ...built.state, "2": { ...built.state["2"], zone: "Hand-1" } };

    const saved = toScenario(state, order, 2, "test");
    const reloaded = buildBoard(cards, game, saved);

    expect(reloaded.order["Shared-Deck"]).toEqual(["3", "1", "4"]);
    expect(reloaded.order["Hand-1"]).toEqual(["2"]);
  });

  test("rotation, face and free coordinates survive the round trip", () => {
    const built = buildBoard(cards, game, null);
    const state = {
      ...built.state,
      "1": { zone: null, rotation: -270, faceUp: true, x: 12.5, y: -40 },
      "2": { ...built.state["2"], rotation: 90, faceUp: true },
    };
    const order = { ...built.order, "Shared-Deck": ["2", "3", "4"] };

    const reloaded = buildBoard(cards, game, toScenario(state, order, 2));

    expect(reloaded.state["1"]).toEqual({ zone: null, rotation: -270, faceUp: true, x: 12.5, y: -40 });
    expect(reloaded.state["2"].rotation).toBe(90);
    expect(reloaded.state["2"].faceUp).toBe(true);
    // A free card belongs to no zone list.
    expect(reloaded.order["Shared-Deck"]).toEqual(["2", "3", "4"]);
  });

  test("cards the scenario never mentions fall in behind, in catalogue order", () => {
    const built = buildBoard(cards, game, null);
    const saved = toScenario(built.state, { "Shared-Deck": ["4", "3"] }, 2);

    const withNewCards = [...cards, { id: "5", cardName: "Card 5", cardType: "Action" }];
    const reloaded = buildBoard(withNewCards, game, saved);

    expect(reloaded.order["Shared-Deck"]).toEqual(["4", "3", "1", "2", "5"]);
  });
});

describe("reseating the table", () => {
  test("listZones follows the live player count, not the setup", () => {
    expect(listZones(game, 1).map((z) => z.id)).toEqual(["Shared-Deck", "Hand-1"]);
    expect(listZones(game, 3).map((z) => z.id))
      .toEqual(["Shared-Deck", "Hand-1", "Hand-2", "Hand-3"]);
    // Default still comes from the setup.
    expect(listZones(game).map((z) => z.id)).toEqual(["Shared-Deck", "Hand-1", "Hand-2"]);
  });

  test("a scenario overrides the setup player count", () => {
    expect(playerCount(game, null)).toBe(2);
    expect(playerCount(game, { schema: "s", name: "n", players: 5, placements: [] })).toBe(5);
  });

  test("removing a seat frees its cards where they sat", () => {
    const built = buildBoard(cards, game, null, 2);
    const order = { ...built.order, "Shared-Deck": ["1"], "Hand-1": ["2"], "Hand-2": ["3", "4"] };
    const state = {
      ...built.state,
      "2": { ...built.state["2"], zone: "Hand-1" },
      "3": { ...built.state["3"], zone: "Hand-2" },
      "4": { ...built.state["4"], zone: "Hand-2" },
    };

    const at: Record<string, { x: number; y: number }> = { "3": { x: 10, y: 20 }, "4": { x: 30, y: 40 } };
    const next = reconcileZones(state, order, listZones(game, 1), (id) => at[id]);

    // Hand-2 is gone; its cards are free at the spots they occupied.
    expect(next.order["Hand-2"]).toBeUndefined();
    expect(next.state["3"]).toMatchObject({ zone: null, x: 10, y: 20 });
    expect(next.state["4"]).toMatchObject({ zone: null, x: 30, y: 40 });
    // Surviving zones are untouched.
    expect(next.order["Shared-Deck"]).toEqual(["1"]);
    expect(next.order["Hand-1"]).toEqual(["2"]);
    expect(next.state["2"].zone).toBe("Hand-1");
  });

  test("a card with no measurable position keeps whatever it had", () => {
    const built = buildBoard(cards, game, null, 2);
    const order = { ...built.order, "Hand-2": ["3"] };
    const state = { ...built.state, "3": { ...built.state["3"], zone: "Hand-2", x: 7, y: 8 } };

    const next = reconcileZones(state, order, listZones(game, 1), () => undefined);
    expect(next.state["3"]).toMatchObject({ zone: null, x: 7, y: 8 });
  });

  test("adding a seat just opens empty zones", () => {
    const built = buildBoard(cards, game, null, 2);
    const next = reconcileZones(built.state, built.order, listZones(game, 4), () => undefined);

    expect(next.order["Hand-3"]).toEqual([]);
    expect(next.order["Hand-4"]).toEqual([]);
    expect(next.order["Shared-Deck"]).toEqual(built.order["Shared-Deck"]);
    expect(next.state).toEqual(built.state);
  });
});


import { CardFace, CardZoneType, Position, Rotation } from "enums";

// Define the CardData type
export interface CardData {
  id: string;
  cardName: string;
  cardType: string;
  cardText: string;
  cardColor: string;
  startZone: string;
  playerId: string;
}

export interface GameSetup {
  Players: number;
  Cards: CardData[],
  SharedZones: RowSetup[],
  PlayerZones: RowSetup[],
}
export interface RowSetup {
  RowName: string,
  Zones: ZoneSetup[]
}
export interface ZoneSetup {
  Name: string;
  CardDisplay: CardFace;
  ZoneType: CardZoneType;
  CardRotation?: Rotation;
  TextPosition?: Position;
}

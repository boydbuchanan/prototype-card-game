
import { CardFace, CardType, CardZoneType, Position, Rotation } from "enums";

// Define the CardData type
export interface CardData {
  id: string;
  cardName: string;
  cardType: CardType;
  cardText: string;
  cardColor: string;
  startZone: string;
  playerId: string;
  canDrag?: boolean;
  clickRotate?: boolean;
}

export interface GameSetup {
  Players: number;
  Cards: CardData[],
  CardTypeComponentMap: Record<CardType, React.ComponentType<any>>,
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


export enum Rotation {
  Normal = "normal",
  Left = "left",
  Right = "right",
  Reverse = "reverse",
}

export enum Position {
  Top = "top",
  Left = "left",
  Right = "right",
  Bottom = "bottom",
}
/** Zones only impose order. Free placement is what the canvas does. */
export enum CardZoneType {
  Stack,
  Row,
  Column,
}

export enum TableShape {
  Square = "square",
  Round = "round",
  Rectangle = "rectangle",
}
export enum CardFace {
  FaceUp = "faceUp",
  FaceDown = "faceDown",
  Both = "both",
}

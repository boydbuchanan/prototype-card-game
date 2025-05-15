// You can place this component in a new file, e.g., src/components/PlayingCardsLogo.tsx

import React from "react";

const PlayingCardsLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    {/* Left card (red) */}
    <rect
      x="6"
      y="10"
      width="28"
      height="38"
      rx="4"
      fill="#fff"
      stroke="#e74c3c"
      strokeWidth="2"
      transform="rotate(-12 6 10)"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
    />
    {/* Middle card (green) */}
    <rect
      x="12"
      y="4"
      width="28"
      height="38"
      rx="4"
      fill="#fff"
      stroke="#2ecc71"
      strokeWidth="2"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.10))" }}
    />
    {/* Right card (blue) */}
    <rect
      x="18"
      y="10"
      width="28"
      height="38"
      rx="4"
      fill="#fff"
      stroke="#2980d9"
      strokeWidth="2"
      transform="rotate(12 18 10)"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
    />
    {/* Diamond symbol centered on right card with same rotation */}
    <g transform="rotate(12 32 29)">
      <text
        x="28"
        y="30"
        fontSize="20"
        fill="#2980d9"
        fontFamily="Arial"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        ♦
      </text>
    </g>
  </svg>
);

export default PlayingCardsLogo;
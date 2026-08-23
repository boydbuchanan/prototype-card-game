import React from "react";
import { CardData, CardTemplate as TemplateDef, CardTemplates, Region, RegionStyle } from "types";
import "./CardTemplate.css";

function isImageUrl(v: string) {
  const path = v.split(/[?#]/)[0];
  return /^(data:|blob:|https?:|\.{0,2}\/)/.test(v) || /\.(svg|png|jpe?g|webp|gif|avif)$/i.test(path);
}

function backgroundStyle(bg?: string): React.CSSProperties {
  if (!bg) return {};
  if (isImageUrl(bg)) return { backgroundImage: `url("${bg.replace(/"/g, "%22")}")` };
  return { background: bg };
}

/**
 * `rotate` is where the region is printed on the card. Rather than doing px maths to
 * rotate a box, the sideways cases use writing-mode — the text then wraps along the
 * correct axis at any card size.
 */
function rotationStyle(rotate: number = 0): React.CSSProperties {
  switch (rotate) {
    case 90:  return { writingMode: "vertical-rl" };
    case 270: return { writingMode: "vertical-rl", transform: "rotate(180deg)" };
    case 180: return { transform: "rotate(180deg)" };
    default:  return {};
  }
}

/** Named style, or an inline one; keys on the region itself override either. */
function resolveStyle(region: Region, styles: Record<string, RegionStyle> = {}): RegionStyle {
  const named = typeof region.style === "string" ? styles[region.style] : region.style;
  const { bg, color, size, weight, align } = region;
  const own: RegionStyle = {};
  if (bg !== undefined) own.bg = bg;
  if (color !== undefined) own.color = color;
  if (size !== undefined) own.size = size;
  if (weight !== undefined) own.weight = weight;
  if (align !== undefined) own.align = align;
  return { ...(named || {}), ...own };
}

interface Props {
  card: CardData;
  template: TemplateDef;
  templates: CardTemplates;
}

const CardTemplateContent: React.FC<Props> = ({ card, template, templates }) => {
  const styles = templates.styles || {};

  return (
    <div className="card-template" style={backgroundStyle(template.frame)}>
      {template.regions.map((region, i) => {
        const s = resolveStyle(region, styles);
        const [x, y, w, h] = region.rect;
        const value = region.column ? card[region.column] : undefined;

        return (
          <div
            key={i}
            className="card-region"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
              ...backgroundStyle(s.bg),
            }}
          >
            {value != null && value !== "" && (
              <div
                className="card-region-text"
                style={{
                  color: s.color,
                  fontSize: s.size ? `${s.size}px` : undefined,
                  fontWeight: s.weight,
                  textAlign: s.align || "center",
                  justifyContent: s.align || "center",
                  ...rotationStyle(region.rotate),
                }}
              >
                {String(value)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// The regions of a card are recomputed from scratch on every render, so keeping
// this out of the render path unless the card itself changed is what stops a
// single rotation re-laying-out every region of every card on the table.
export default React.memo(CardTemplateContent);

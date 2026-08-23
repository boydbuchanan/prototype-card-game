import React from "react";
import { CardData, CardTemplate as TemplateDef, CardTemplates, Region, RegionStyle } from "types";
import "./CardTemplate.css";

/** A `bg` value is an image if it looks like a URL/data URI/file, or is inline SVG. */
function isSvg(v: string) {
  return v.trim().startsWith("<svg");
}
function isImageUrl(v: string) {
  return /^(data:|https?:|\.{0,2}\/)/.test(v) || /\.(svg|png|jpe?g|webp|gif)$/i.test(v);
}

function backgroundStyle(bg?: string): React.CSSProperties {
  if (!bg || isSvg(bg)) return {};
  if (isImageUrl(bg)) return { backgroundImage: `url("${bg}")` };
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
      {template.frame && isSvg(template.frame) && (
        <div className="card-template-svg" dangerouslySetInnerHTML={{ __html: template.frame }} />
      )}

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
            {s.bg && isSvg(s.bg) && (
              <div className="card-region-svg" dangerouslySetInnerHTML={{ __html: s.bg }} />
            )}
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

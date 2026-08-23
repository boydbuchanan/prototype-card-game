import React, { createContext, useContext, useEffect } from "react";
import { CardTemplates } from "types";

/**
 * The loaded card templates, available to any card without threading them
 * through Zone and PlayArea. Null until `cardTemplates.json` has loaded, or
 * for good if the project ships none.
 */
const TemplateContext = createContext<CardTemplates | null>(null);

export const TemplateProvider: React.FC<{
  templates: CardTemplates | null;
  children: React.ReactNode;
}> = ({ templates, children }) => {
  /**
   * A template owns the card's dimensions, and zones size themselves off the
   * same numbers, so publish them as CSS variables rather than as inline styles
   * on each card. :root is the only place that reaches both the board and the
   * drag ghost, which is appended to document.body.
   */
  useEffect(() => {
    const root = document.documentElement;
    const apply = (name: string, px?: number) => {
      if (px == null) root.style.removeProperty(name);
      else root.style.setProperty(name, `${px}px`);
    };
    apply("--ct-card-width", templates?.card?.width);
    apply("--ct-card-height", templates?.card?.height);
    apply("--ct-card-radius", templates?.card?.radius);
  }, [templates]);

  return <TemplateContext.Provider value={templates}>{children}</TemplateContext.Provider>;
};

export function useTemplates() {
  return useContext(TemplateContext);
}

export default TemplateContext;

import type { ComponentType } from "react";
import Home from "./Home";

/**
 * Each entry is one designer-submitted flow, integrated after passing the
 * lead designer's structural review. Route path is the only thing this repo
 * decides — the screen owns everything under it.
 */
export const screens: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: Home },
];

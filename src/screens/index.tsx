import type { ComponentType } from "react";
import ProjectSelect from "./ProjectSelect";
import Chat from "./Chat";
import ChatRoom from "./ChatRoom";
import CreateProject from "./CreateProject";

/**
 * Each entry is one designer-submitted flow, integrated after passing the
 * lead designer's structural review. Route path is the only thing this repo
 * decides — the screen owns everything under it.
 */
export const screens: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: ProjectSelect },
  { path: "/chat", Component: Chat },
  { path: "/chat/:roomId", Component: ChatRoom },
  { path: "/create-project", Component: CreateProject },
];

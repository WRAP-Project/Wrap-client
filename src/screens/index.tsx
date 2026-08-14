import type { ComponentType } from "react";
import ProjectSelect from "./ProjectSelect";
import Chat from "./Chat";
import ChatRoom from "./ChatRoom";
import CreateProject from "./CreateProject";
import ProjectDetail from "./ProjectDetail";
import MyPage from "./MyPage";
import EditProfile from "./EditProfile";
import Calendar from "./Calendar";

/**
 * Each entry is one designer-submitted flow, integrated after passing the
 * lead designer's structural review. Route path is the only thing this repo
 * decides — the screen owns everything under it.
 */
export const screens: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: ProjectSelect },
  { path: "/project/:projectId", Component: ProjectDetail },
  { path: "/chat", Component: Chat },
  { path: "/chat/:roomId", Component: ChatRoom },
  { path: "/calendar", Component: Calendar },
  { path: "/create-project", Component: CreateProject },
  { path: "/mypage", Component: MyPage },
  { path: "/mypage/edit", Component: EditProfile },
];

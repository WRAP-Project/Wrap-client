import type { ComponentType } from "react";
import ProjectSelect from "./ProjectSelect";
import Chat from "./Chat";
import ChatRoom from "./ChatRoom";
import CreateProject from "./CreateProject";
import ProjectCreated from "./ProjectCreated";
import InviteTeam from "./InviteTeam";
import ProjectDetail from "./ProjectDetail";
import MilestoneDetail from "./MilestoneDetail";
import TeamActivity from "./TeamActivity";
import ProjectSchedule from "./ProjectSchedule";
import ProgressReport from "./ProgressReport";
import MyPage from "./MyPage";
import EditProfile from "./EditProfile";
import Calendar from "./Calendar";
import AdjustSchedule from "./AdjustSchedule";
import AdjustCreate from "./AdjustCreate";
import AdjustDetail, { AdjustHeatmap } from "./AdjustDetail";

/**
 * Each entry is one designer-submitted flow, integrated after passing the
 * lead designer's structural review. Route path is the only thing this repo
 * decides — the screen owns everything under it.
 */
export const screens: { path: string; Component: ComponentType }[] = [
  { path: "/", Component: ProjectSelect },
  { path: "/project/:projectId", Component: ProjectDetail },
  { path: "/project/:projectId/milestone", Component: MilestoneDetail },
  { path: "/project/:projectId/team", Component: TeamActivity },
  { path: "/project/:projectId/schedule", Component: ProjectSchedule },
  { path: "/project/:projectId/report", Component: ProgressReport },
  { path: "/chat", Component: Chat },
  { path: "/chat/:roomId", Component: ChatRoom },
  { path: "/calendar", Component: Calendar },
  { path: "/calendar/adjust", Component: AdjustSchedule },
  { path: "/calendar/adjust/new", Component: AdjustCreate },
  { path: "/calendar/adjust/:requestId", Component: AdjustDetail },
  { path: "/calendar/adjust/:requestId/heatmap", Component: AdjustHeatmap },
  { path: "/create-project", Component: CreateProject },
  { path: "/create-project/:projectId/done", Component: ProjectCreated },
  { path: "/create-project/:projectId/invite", Component: InviteTeam },
  { path: "/mypage", Component: MyPage },
  { path: "/mypage/edit", Component: EditProfile },
];

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import { useAuthContext } from "./AuthContext";
import { initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";

/**
 * 프로젝트 팀원 · 초대 데이터.
 *
 * 백엔드는 링크 초대가 아니라 이메일 초대다 — 초대 링크/코드를 발급하는
 * 엔드포인트가 없다. 그래서 화면도 링크 공유가 아니라 이메일 입력으로 간다.
 *
 *   GET  /projects/{projectId}/members       참여 중인 멤버 (닉네임 있음)
 *   GET  /projects/{projectId}/invitations   보낸 초대 (이메일만, 수락 전)
 *   POST /projects/{projectId}/invitations   { email, role } 로 초대 발송
 *
 * 목록은 두 응답을 합쳐 만든다. 멤버는 JOINED만 취하고 초대 대기는 invitations
 * 쪽에서 가져온다 — 초대가 양쪽에 동시에 잡히면 같은 사람이 두 번 보인다.
 *
 * mock 프로젝트(useProjects.ts의 MOCK_PROJECTS)는 서버에 없으므로 호출을
 * 건너뛰고 빈 목록으로 둔다.
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** JOINED = 수락하고 참여 중, INVITED = 초대만 보낸 상태 */
export type InviteeStatus = "JOINED" | "INVITED";

export interface Invitee {
  id: string;
  /** 참여 중이면 닉네임, 초대 대기면 이메일 */
  name: string;
  /** 아바타에 표시할 1~2자 이니셜 */
  initials: string;
  /** OWNER / MEMBER를 사람이 읽는 문구로 바꾼 값 */
  role: string;
  status: InviteeStatus;
  /** 로그인한 본인인지 — 목록에서 "나"로 표시하고 맨 앞에 둔다. */
  isMe: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjectInvite(projectId: string | undefined) {
  const { member } = useAuthContext();
  const serverId = useMemo(() => serverIdOf(projectId), [projectId]);

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inviting, setInviting] = useState(false);

  const myId = member?.id;

  const load = useCallback(async () => {
    if (serverId === null) {
      setInvitees([]);
      return;
    }
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        apiClient.GET("/projects/{projectId}/members", {
          params: { path: { projectId: serverId } },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
        apiClient.GET("/projects/{projectId}/invitations", {
          params: { path: { projectId: serverId } },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      ]);

      // 실패 본문은 data가 아니라 error에 담긴다 — data만 보면 404/500이 조용히
      // "빈 목록"으로 둔갑한다.
      for (const res of [membersRes, invitationsRes]) {
        if (!res.response.ok || res.data?.success === false) {
          throw new Error(
            apiErrorMessage(
              res.error ?? res.data,
              res.response.status,
              "팀원 목록을 불러오지 못했습니다.",
            ),
          );
        }
      }

      const joined: Invitee[] = (membersRes.data?.data ?? [])
        .filter((m) => m.status === "JOINED")
        .map((m) => {
          const name = m.nickname ?? "이름 없음";
          return {
            id: `member-${m.projectMemberId}`,
            name,
            initials: initialsOf(name),
            role: roleLabelOf(m.role),
            status: "JOINED" as const,
            isMe: myId !== undefined && m.memberId === myId,
          };
        });

      const pending: Invitee[] = (invitationsRes.data?.data ?? [])
        .filter((i) => i.status === "INVITED")
        .map((i) => {
          const name = i.inviteeEmail ?? "이메일 없음";
          return {
            id: `invitation-${i.invitationId}`,
            name,
            initials: initialsOf(name),
            role: roleLabelOf(i.role),
            status: "INVITED" as const,
            isMe: false,
          };
        });

      // 본인을 맨 앞에, 그다음 참여 중인 팀원, 마지막에 초대 대기.
      setInvitees([...joined.filter((m) => m.isMe), ...joined.filter((m) => !m.isMe), ...pending]);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e
          : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setLoading(false);
    }
  }, [serverId, myId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 이메일로 팀원을 초대한다. 성공하면 목록을 다시 불러온다.
   * 실패 사유(이미 초대된 이메일, 없는 회원 등)는 서버 메시지를 그대로 올린다 —
   * 화면이 그 문구를 보여준다.
   */
  const inviteByEmail = useCallback(
    async (email: string): Promise<void> => {
      if (serverId === null) throw new Error("아직 서버에 저장되지 않은 프로젝트입니다.");
      setInviting(true);
      try {
        const { data, error, response } = await apiClient.POST(
          "/projects/{projectId}/invitations",
          {
            params: { path: { projectId: serverId } },
            body: { email, role: "MEMBER" },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );
        if (!response.ok || data?.success === false) {
          // 404는 라우트가 없어서가 아니다 — 엔드포인트는 배포돼 있다(없으면 401이
          // 아니라 404가 인증 전에 떨어진다). 서버가 대상을 못 찾은 경우다.
          const fallback =
            response.status === 404
              ? "가입되지 않은 이메일이거나 프로젝트를 찾을 수 없어요."
              : "초대에 실패했습니다.";
          throw new Error(apiErrorMessage(error ?? data, response.status, fallback));
        }
        await load();
      } finally {
        setInviting(false);
      }
    },
    [serverId, load],
  );

  return { invitees, inviteByEmail, inviting, loading, error, reload: load };
}

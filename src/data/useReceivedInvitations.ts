import { useCallback, useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import { avatarBgOf, initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { REQUEST_TIMEOUT_MS } from "./useProjects";

/**
 * 내가 "받은" 프로젝트 초대.
 *
 * 보내는 쪽(useProjectInvite)의 반대편이다 — A가 POST /projects/{id}/invitations로
 * 이메일 초대를 보내면, B는 여기서 그 초대를 보고 수락/거절한다.
 *
 *   GET   /invitations                    받은 초대 목록
 *   PATCH /invitations/{invitationId}/accept
 *   PATCH /invitations/{invitationId}/reject
 *
 * 목록에는 아직 답하지 않은 INVITED만 남긴다. 이미 수락/거절/취소된 초대는
 * 보여줄 행동이 없어서 화면에 둘 이유가 없다.
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface ReceivedInvitation {
  /** 리스트 key용 문자열 id */
  id: string;
  /** PATCH 경로에 넣는 숫자 id */
  invitationId: number;
  projectName: string;
  /** 초대한 사람의 닉네임 */
  inviterNickname: string;
  /** OWNER / MEMBER를 사람이 읽는 문구로 바꾼 값 */
  role: string;
  /** 아바타에 표시할 1~2자 이니셜 */
  initials: string;
  /** 아바타 배경색 */
  avatarBg: string;
  /** 초대 받은 시각 (ISO) */
  createdAt?: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReceivedInvitations() {
  const [invitations, setInvitations] = useState<ReceivedInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  /** 지금 수락/거절 요청이 나가 있는 초대 — 그 카드의 버튼만 잠근다. */
  const [answeringId, setAnsweringId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: body, response } = await apiClient.GET("/invitations", {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // 실패 본문은 data가 아니라 error에 담긴다 — data만 보면 404/500이 조용히
      // "빈 목록"으로 둔갑한다.
      if (!response.ok || data?.success === false) {
        throw new Error(
          apiErrorMessage(body ?? data, response.status, "받은 초대를 불러오지 못했습니다."),
        );
      }

      const pending: ReceivedInvitation[] = (data?.data ?? [])
        .filter((i) => i.status === "INVITED" && i.invitationId !== undefined)
        .map((i) => {
          const inviter = i.inviterNickname ?? "알 수 없음";
          return {
            id: `invitation-${i.invitationId}`,
            invitationId: i.invitationId as number,
            projectName: i.projectName ?? "이름 없는 프로젝트",
            inviterNickname: inviter,
            role: roleLabelOf(i.role),
            initials: initialsOf(inviter),
            avatarBg: avatarBgOf(inviter),
            createdAt: i.createdAt,
          };
        });

      setInvitations(pending);
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 수락(accept)과 거절(reject)은 경로만 다르고 처리가 같다 — 성공하면 그 초대는
   * 더 이상 INVITED가 아니므로 목록에서 바로 뺀다(다시 조회하지 않는다).
   * 실패 사유는 서버 메시지를 그대로 올린다 — 화면이 그 문구를 보여준다.
   */
  const answer = useCallback(
    async (invitationId: number, action: "accept" | "reject"): Promise<void> => {
      setAnsweringId(invitationId);
      try {
        const path =
          action === "accept"
            ? ("/invitations/{invitationId}/accept" as const)
            : ("/invitations/{invitationId}/reject" as const);

        const { data, error: body, response } = await apiClient.PATCH(path, {
          params: { path: { invitationId } },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok || data?.success === false) {
          const fallback = action === "accept" ? "초대를 수락하지 못했습니다." : "초대를 거절하지 못했습니다.";
          throw new Error(apiErrorMessage(body ?? data, response.status, fallback));
        }

        setInvitations((prev) => prev.filter((i) => i.invitationId !== invitationId));
      } finally {
        setAnsweringId(null);
      }
    },
    [],
  );

  const accept = useCallback(
    (invitationId: number) => answer(invitationId, "accept"),
    [answer],
  );
  const reject = useCallback(
    (invitationId: number) => answer(invitationId, "reject"),
    [answer],
  );

  return { invitations, accept, reject, answeringId, loading, error, reload: load };
}

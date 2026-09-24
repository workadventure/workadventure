import type { ProximityQuestion } from "@workadventure/shared-utils";

export function getUnreadRemoteQuestionIds(
    previousQuestions: Readonly<Record<string, ProximityQuestion>>,
    nextQuestions: Readonly<Record<string, ProximityQuestion>>,
    currentVoterId: string,
): string[] {
    return Object.values(nextQuestions)
        .filter((question) => !(question.id in previousQuestions) && question.senderId !== currentVoterId)
        .map((question) => question.id);
}

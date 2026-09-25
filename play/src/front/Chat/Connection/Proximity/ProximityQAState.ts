import type { ProximityQuestion } from "@workadventure/shared-utils";

// Turns a question of the space state (owned by the back, see ProximityQAManager) into what the chat UI renders.

export type ProximityQAState = {
    id: string;
    body: string;
    senderId: string;
    senderName: string | undefined;
    createdAt: number;
    isAnswered: boolean;
    upvoteCount: number;
    hasUpvoted: boolean;
    canUpvote: boolean;
    canDelete: boolean;
    canMarkAnswered: boolean;
};

export function computeProximityQAState(
    question: ProximityQuestion,
    currentVoterId: string,
    canMarkAnswered: boolean,
    canDeleteAny: boolean,
): ProximityQAState {
    const upvoterIds = Object.keys(question.upvotes).filter((voterId) => voterId !== question.senderId);
    const isAuthor = question.senderId === currentVoterId;
    const isAnswered = question.answer !== undefined;

    return {
        id: question.id,
        body: question.body,
        senderId: question.senderId,
        senderName: question.senderName,
        createdAt: question.createdAt,
        isAnswered,
        upvoteCount: upvoterIds.length,
        hasUpvoted: upvoterIds.includes(currentVoterId),
        canUpvote: !isAuthor && !isAnswered,
        canDelete: isAuthor || canDeleteAny,
        canMarkAnswered: canMarkAnswered && !isAnswered,
    };
}

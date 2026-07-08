import { parseProximityQAMetadata } from "./ProximityQAMetadata";

export function getUnreadRemoteQuestionIds(
    previousMetadata: Map<string, unknown>,
    nextMetadata: Map<string, unknown>,
    currentVoterId: string,
): string[] {
    const previousQuestionIds = new Set(
        parseProximityQAMetadata(previousMetadata).questions.map((question) => question.id),
    );

    return parseProximityQAMetadata(nextMetadata)
        .questions.filter((question) => !previousQuestionIds.has(question.id) && question.senderId !== currentVoterId)
        .map((question) => question.id);
}

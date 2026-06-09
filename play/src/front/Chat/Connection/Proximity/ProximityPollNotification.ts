import { parseProximityPollMetadata, type ProximityPollDefinitionMetadata } from "./ProximityPollMetadata";

export function getNewRemoteProximityPolls(
    previousMetadata: Map<string, unknown>,
    nextMetadata: Map<string, unknown>,
    currentVoterId: string,
): ProximityPollDefinitionMetadata[] {
    const previousPollIds = new Set(parseProximityPollMetadata(previousMetadata).polls.map((poll) => poll.id));
    return parseProximityPollMetadata(nextMetadata).polls.filter(
        (poll) => !previousPollIds.has(poll.id) && poll.senderId !== currentVoterId,
    );
}

export function getProximityPollNotificationMessage(poll: ProximityPollDefinitionMetadata, pollTitle = "Poll"): string {
    return `${pollTitle}: ${poll.question}`;
}

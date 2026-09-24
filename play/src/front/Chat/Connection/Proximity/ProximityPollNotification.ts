import type { ProximityPoll } from "@workadventure/shared-utils";

export function getNewRemoteProximityPolls(
    previousPolls: Readonly<Record<string, ProximityPoll>>,
    nextPolls: Readonly<Record<string, ProximityPoll>>,
    currentVoterId: string,
): ProximityPoll[] {
    return Object.values(nextPolls).filter((poll) => !(poll.id in previousPolls) && poll.senderId !== currentVoterId);
}

export function getProximityPollNotificationMessage(poll: ProximityPoll, pollTitle = "Poll"): string {
    return `${pollTitle}: ${poll.question}`;
}

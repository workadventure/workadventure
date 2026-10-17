export type SelectedIceRoute = {
    /** Whether either end of the connection goes through a TURN server. */
    relay: boolean;
    /** Transport to the TURN server when relayed, to the peer otherwise. */
    protocol: "udp" | "tcp" | "tls" | undefined;
    /** Current ICE round-trip time of the selected pair. */
    roundTripTimeMs?: number;
};

type CandidatePairStats = {
    localCandidateId?: string;
    remoteCandidateId?: string;
    nominated?: boolean;
    state?: string;
    currentRoundTripTime?: number;
    // Firefox only.
    selected?: boolean;
};

type CandidateStats = {
    candidateType?: string;
    protocol?: string;
    relayProtocol?: string;
};

/**
 * How a peer connection's traffic actually travels, read from the candidate pair ICE selected.
 * Undefined while no pair is selected.
 */
export function getSelectedIceRoute(report: RTCStatsReport): SelectedIceRoute | undefined {
    const stats = [...report.values()] as RTCStats[];
    const selectedPairId = stats
        .filter((stat): stat is RTCTransportStats => stat.type === "transport")
        .map((transport) => transport.selectedCandidatePairId)
        .find((pairId) => pairId !== undefined && report.has(pairId));
    const pair: CandidatePairStats | undefined =
        selectedPairId !== undefined
            ? (report.get(selectedPairId) as CandidatePairStats)
            : stats
                  .filter((stat) => stat.type === "candidate-pair")
                  .map((stat) => stat as CandidatePairStats)
                  .find(
                      (candidatePair) =>
                          candidatePair.selected === true ||
                          (candidatePair.nominated === true && candidatePair.state === "succeeded"),
                  );
    if (!pair) {
        return undefined;
    }

    const local = pair.localCandidateId ? (report.get(pair.localCandidateId) as CandidateStats | undefined) : undefined;
    const remote = pair.remoteCandidateId
        ? (report.get(pair.remoteCandidateId) as CandidateStats | undefined)
        : undefined;
    const protocol = (local?.relayProtocol || local?.protocol || remote?.protocol)?.toLowerCase();
    return {
        relay: local?.candidateType === "relay" || remote?.candidateType === "relay",
        protocol: protocol === "udp" || protocol === "tcp" || protocol === "tls" ? protocol : undefined,
        roundTripTimeMs:
            typeof pair.currentRoundTripTime === "number" &&
            Number.isFinite(pair.currentRoundTripTime) &&
            pair.currentRoundTripTime >= 0
                ? pair.currentRoundTripTime * 1000
                : undefined,
    };
}

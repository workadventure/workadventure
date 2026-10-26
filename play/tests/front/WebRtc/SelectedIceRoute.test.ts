import { describe, expect, it } from "vitest";
import { getSelectedIceRoute } from "../../../src/front/WebRtc/SelectedIceRoute";

function report(...stats: { id: string; type: string; [key: string]: unknown }[]): RTCStatsReport {
    return new Map(stats.map((stat) => [stat.id, stat]));
}

const directPair = [
    { id: "L1", type: "local-candidate", candidateType: "host", protocol: "udp" },
    { id: "R1", type: "remote-candidate", candidateType: "srflx", protocol: "udp" },
    { id: "P1", type: "candidate-pair", localCandidateId: "L1", remoteCandidateId: "R1" },
];

describe("getSelectedIceRoute", () => {
    it("reads a relay, and the transport to it, from the pair the transport selected", () => {
        expect(
            getSelectedIceRoute(
                report(
                    ...directPair,
                    {
                        id: "L2",
                        type: "local-candidate",
                        candidateType: "relay",
                        protocol: "udp",
                        relayProtocol: "TLS",
                    },
                    { id: "P2", type: "candidate-pair", localCandidateId: "L2", remoteCandidateId: "R1" },
                    { id: "T1", type: "transport", selectedCandidatePairId: "P2" },
                ),
            ),
        ).toEqual({ relay: true, protocol: "tls" });
    });

    it("falls back to the nominated pair when no transport names one, as in Firefox", () => {
        expect(
            getSelectedIceRoute(
                report(
                    {
                        id: "L1",
                        type: "local-candidate",
                        candidateType: "relay",
                        protocol: "udp",
                        relayProtocol: "tcp",
                    },
                    {
                        id: "P0",
                        type: "candidate-pair",
                        localCandidateId: "L1",
                        remoteCandidateId: "R1",
                        state: "failed",
                    },
                    ...directPair.slice(1),
                    { id: "L2", type: "local-candidate", candidateType: "host", protocol: "udp" },
                    {
                        id: "P2",
                        type: "candidate-pair",
                        localCandidateId: "L2",
                        remoteCandidateId: "R1",
                        nominated: true,
                        state: "succeeded",
                    },
                ),
            ),
        ).toEqual({ relay: false, protocol: "udp" });
    });

    it("says nothing while no pair is selected", () => {
        expect(getSelectedIceRoute(report(...directPair))).toBeUndefined();
    });
});

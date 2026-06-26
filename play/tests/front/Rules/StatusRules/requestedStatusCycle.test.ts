import { describe, expect, it } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    getNextRequestedStatus,
    requestedStatusCycle,
} from "../../../../src/front/Rules/StatusRules/requestedStatusCycle";
import { statusBlocksRequestedStatusChange } from "../../../../src/front/Rules/StatusRules/statusRules";

describe("requestedStatusCycle", () => {
    it("walks through the documented order then loops back to ONLINE", () => {
        let current = requestedStatusCycle[0];
        const visited = [current];
        for (let i = 0; i < requestedStatusCycle.length; i++) {
            current = getNextRequestedStatus(current);
            visited.push(current);
        }
        expect(visited).toEqual([
            null,
            AvailabilityStatus.BUSY,
            AvailabilityStatus.BACK_IN_A_MOMENT,
            AvailabilityStatus.DO_NOT_DISTURB,
            null,
        ]);
    });

    it("returns ONLINE when the current status is not in the cycle", () => {
        // A system-assigned status (e.g. JITSI) should never be the user's requested status,
        // but if it ever leaks in we want a safe fallback rather than throwing.
        expect(getNextRequestedStatus(AvailabilityStatus.JITSI as never)).toBe(null);
    });

    it("identifies availability statuses that should lock requested status changes", () => {
        expect(statusBlocksRequestedStatusChange(AvailabilityStatus.JITSI)).toBe(true);
        expect(statusBlocksRequestedStatusChange(AvailabilityStatus.SILENT)).toBe(true);
        expect(statusBlocksRequestedStatusChange(AvailabilityStatus.BUSY)).toBe(false);
        expect(statusBlocksRequestedStatusChange(AvailabilityStatus.ONLINE)).toBe(false);
    });
});

import { describe, expect } from "vitest";
import { AvailabilityStatus } from "../../../../../../libs/messages";
import { statusRules } from "../statusRules";

describe("Status Rules", () => {
    test.each([
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.BUSY, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.DO_NOT_DISTRUB, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.BACK_IN_A_MOMENT, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.ONLINE, result: true },
        { actualStatus: AvailabilityStatus.BUSY, futureStatus: AvailabilityStatus.DO_NOT_DISTRUB, result: true },
        { actualStatus: AvailabilityStatus.BUSY, futureStatus: AvailabilityStatus.JITSI, result: false },
        { actualStatus: AvailabilityStatus.JITSI, futureStatus: AvailabilityStatus.BUSY, result: false },
    ])(
        "change status $actualStatus to status $futureStatus to be $result  ",
        ({
            actualStatus,
            futureStatus,
            result,
        }: {
            actualStatus: AvailabilityStatus;
            futureStatus: AvailabilityStatus;
            result: boolean;
        }) => {
            //Arrange
            //Act
            const isValid: boolean = statusRules.canChangeStatus(actualStatus).to(futureStatus);
            //Assert
            expect(isValid).toBe(result);
        }
    );

    it("", () => {});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import type { TimedRules } from "../statusRules";
import { BasicStatusStrategy } from "../StatusStrategy/BasicStatusStrategy";
import { BackInAMomentStatusStrategy } from "../StatusStrategy/BackInAMomentStatusStrategy";
import { StatusStrategyFactory } from "../StatusFactory/StatusStrategyFactory";
import type { StatusStrategyFactoryInterface } from "../StatusChanger";
import { StatusChanger } from "../StatusChanger";
import type { StatusStrategyInterface } from "../StatusStrategyInterface";

// The real strategies reach popups and MediaStore, whose module graph cycles back through
// MediaManager -> ScreenSharingStore and dies on import. Stub the leaves so the factory
// itself stays under test.
vi.mock("../statusChangerFunctions", () => ({
    askToChangeStatus: vi.fn(),
    askIfUserWantToJoinBubbleOf: vi.fn(),
    resetAllStatusStoreExcept: vi.fn(),
    passStatusToOnline: vi.fn(),
    closeChangeStatusConfirmationModal: vi.fn(),
    closeBubbleConfirmationModal: vi.fn(),
    hideBubbleConfirmationModal: vi.fn(),
}));
vi.mock("../../../Stores/PopupStore", () => ({
    popupStore: { addPopup: vi.fn(), removePopup: vi.fn() },
}));
vi.mock("../../../Connection/LocalUserStore", () => ({
    localUserStore: {
        getLastNotificationPermissionRequest: vi.fn(),
        setLastNotificationPermissionRequest: vi.fn(),
    },
}));

describe("Status Rules", () => {
    describe("StatusChanger", () => {
        it("should create an instance of statusStrategy with online Status by default", () => {
            //Arrange
            const mockCreateStrategy = vi.fn().mockReturnValueOnce(new BasicStatusStrategy(AvailabilityStatus.BUSY));

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(mockStatusStrategyFactory);
            //Act
            const actualStatus = statusStrategy.getActualStatus();
            //Assert
            expect(actualStatus).toBe(AvailabilityStatus.ONLINE);
        });
        it("should set the status", () => {
            //Arrange
            const actualStatus = AvailabilityStatus.ONLINE;
            const actualStrategy = new BasicStatusStrategy(actualStatus, [], []);
            const newStatus = AvailabilityStatus.BBB;

            const mockCreateStrategy = vi.fn().mockReturnValueOnce(new BasicStatusStrategy(newStatus));

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(mockStatusStrategyFactory, actualStrategy);
            expect(statusStrategy.getActualStatus()).toBe(actualStatus);

            //Act
            statusStrategy.changeStatusTo(newStatus);

            const result = statusStrategy.getActualStatus();

            //Assert
            expect(result).toBe(newStatus);
        });
        // The derived availabilityStatusStore routinely preempts a requested status with an
        // automatic one (BUSY -> SILENT on entering a silent zone, and back out again). Those
        // used to throw. Nothing may reject a status here: the store has already emitted it.
        it("should accept a transition between an automatic and a requested status", () => {
            const statusStrategy = new StatusChanger(
                StatusStrategyFactory,
                new BasicStatusStrategy(AvailabilityStatus.BUSY),
            );

            statusStrategy.changeStatusTo(AvailabilityStatus.SILENT);
            expect(statusStrategy.getActualStatus()).toBe(AvailabilityStatus.SILENT);

            statusStrategy.changeStatusTo(AvailabilityStatus.BUSY);
            expect(statusStrategy.getActualStatus()).toBe(AvailabilityStatus.BUSY);
        });
        it("should accept the status the browser imposes when sound is blocked while away", () => {
            const statusStrategy = new StatusChanger(
                StatusStrategyFactory,
                new BasicStatusStrategy(AvailabilityStatus.AWAY),
            );

            //Act
            statusStrategy.changeStatusTo(AvailabilityStatus.SOUND_BLOCKED);

            //Assert
            expect(statusStrategy.getActualStatus()).toBe(AvailabilityStatus.SOUND_BLOCKED);
        });
        it("should apply rules of new status and delete rules of old status when you change status", () => {
            //Arrange
            const applyAllRulesOld = vi.fn();
            const cleanTimedRulesOld = vi.fn();

            const mockOldBasicStatusStrategy: StatusStrategyInterface = {
                applyAllRules: applyAllRulesOld,
                applyBasicRules: vi.fn(),
                applyTimedRules: vi.fn(),
                getActualStatus: vi.fn(),
                cleanTimedRules: cleanTimedRulesOld,
                applyInteractionRules: vi.fn(),
                setUserNameInteraction: vi.fn(),
                allowNotificationSound: vi.fn(),
            };

            const newStatus = AvailabilityStatus.BBB;
            const applyAllRulesNew = vi.fn();
            const mockNewBasicStatusStrategy = {
                applyAllRules: applyAllRulesNew,
                applyBasicRules: vi.fn(),
                applyTimedRules: vi.fn(),
                getActualStatus: vi.fn().mockReturnValueOnce(AvailabilityStatus.BBB),
                cleanTimedRules: vi.fn(),
                applyInteractionRules: vi.fn(),
                setUserNameInteraction: vi.fn(),
                allowNotificationSound: vi.fn(),
            };

            const mockCreateStrategy = vi.fn().mockReturnValueOnce(mockNewBasicStatusStrategy);

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(
                mockStatusStrategyFactory,
                mockOldBasicStatusStrategy,
            );

            expect(applyAllRulesOld).toHaveBeenCalledOnce();
            expect(cleanTimedRulesOld).not.toHaveBeenCalled();
            expect(applyAllRulesNew).not.toHaveBeenCalled();
            //Act
            statusStrategy.changeStatusTo(newStatus);
            expect(cleanTimedRulesOld).toHaveBeenCalledOnce();
            const result: AvailabilityStatus = statusStrategy.getActualStatus();

            //Assert
            expect(result).toBe(newStatus);
            expect(applyAllRulesNew).toHaveBeenCalledOnce();
        });
    });
    // SOUND_BLOCKED and BACK_IN_A_MOMENT both mean "cannot take part right now", but only
    // BACK_IN_A_MOMENT is a deliberate choice. Handing the imposed one the requested one's
    // strategy is what made a blocked <audio> element eventually prompt "still back in a
    // moment?" at users who never asked for the status.
    describe("SOUND_BLOCKED is not a requested BACK_IN_A_MOMENT", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it("should not give it the BACK_IN_A_MOMENT strategy", () => {
            const strategy = StatusStrategyFactory.createStrategy(AvailabilityStatus.SOUND_BLOCKED);

            expect(strategy).not.toBeInstanceOf(BackInAMomentStatusStrategy);
        });

        it("should not arm the timed rule that asks the user to change status", () => {
            const backInAMoment = StatusStrategyFactory.createStrategy(AvailabilityStatus.BACK_IN_A_MOMENT);
            backInAMoment.applyAllRules();
            expect(vi.getTimerCount()).toBe(1);

            vi.clearAllTimers();

            const soundBlocked = StatusStrategyFactory.createStrategy(AvailabilityStatus.SOUND_BLOCKED);
            soundBlocked.applyAllRules();
            expect(vi.getTimerCount()).toBe(0);
        });

        it("should still mute notification sounds, which could not play anyway", () => {
            const strategy = StatusStrategyFactory.createStrategy(AvailabilityStatus.SOUND_BLOCKED);

            expect(strategy.allowNotificationSound()).toBe(false);
        });
    });
    describe("StatusStrategy", () => {
        it("should apply all basic rules pass in the constructor when you call applyBasicRules", () => {
            const rule1 = vi.fn();
            const rule2 = vi.fn();

            const rules: Array<() => void> = [rule1, rule2];

            const basicStatusStrategy = new BasicStatusStrategy(AvailabilityStatus.ONLINE, rules);

            // basicStatusStrategy.addRule(rules);

            basicStatusStrategy.applyBasicRules();

            expect(rule1).toHaveBeenCalledOnce();
            expect(rule2).toHaveBeenCalledOnce();
        });
        describe("test Timed Rules", () => {
            beforeEach(() => {
                // tell vitest we use mocked time
                vi.useFakeTimers();
            });
            it("should apply all timed rules pass in the constructor when you call applyTimedRules ", () => {
                const maxTime = 10000;
                const minTime = 1000;

                const rule1: TimedRules = {
                    applyIn: minTime,
                    rule: vi.fn(),
                };
                const rule2: TimedRules = {
                    applyIn: maxTime,
                    rule: vi.fn(),
                };

                const timedRules: Array<TimedRules> = [rule1, rule2];

                const basicStatusStrategy = new BasicStatusStrategy(AvailabilityStatus.ONLINE, [], timedRules);

                basicStatusStrategy.applyTimedRules();
                vi.advanceTimersToNextTimer();

                expect(rule1.rule).toHaveBeenCalledOnce();
                expect(rule2.rule).not.toHaveBeenCalledOnce();

                vi.advanceTimersToNextTimer();

                expect(rule1.rule).toHaveBeenCalledOnce();
                expect(rule2.rule).toHaveBeenCalledOnce();
            });
            it("should not apply rule when you call cleanTimedRules", () => {
                const time = 10000;

                const rule1: TimedRules = {
                    applyIn: time,
                    rule: vi.fn(),
                };

                const timedRules: Array<TimedRules> = [rule1];

                const basicStatusStrategy = new BasicStatusStrategy(AvailabilityStatus.ONLINE, [], timedRules);

                basicStatusStrategy.applyTimedRules();
                vi.advanceTimersByTime(time / 2);
                basicStatusStrategy.cleanTimedRules();
                vi.advanceTimersToNextTimer();

                expect(rule1.rule).not.toHaveBeenCalled();
            });
            it("should  apply all type of rule when you call applyAllRules", () => {
                const time = 10000;

                const rule = vi.fn();
                const timedRule: TimedRules = {
                    applyIn: time,
                    rule: vi.fn(),
                };

                const basicStatusStrategy = new BasicStatusStrategy(AvailabilityStatus.ONLINE, [rule], [timedRule]);

                basicStatusStrategy.applyAllRules();

                expect(rule).toHaveBeenCalled();
                expect(timedRule.rule).not.toHaveBeenCalled();

                vi.advanceTimersToNextTimer();

                expect(timedRule.rule).toHaveBeenCalled();
            });
        });
    });
});

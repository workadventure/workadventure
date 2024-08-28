import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import { StatusRules, StatusRulesVerificationInterface, TimedRules } from "../statusRules";
import { BasicStatusStrategy } from "../StatusStrategy/BasicStatusStrategy";
import { InvalidStatusTransitionError } from "../Errors/InvalidStatusTransitionError";
import { StatusChanger, StatusStrategyFactoryInterface } from "../StatusChanger";
import { StatusStrategyInterface } from "../StatusStrategyInterface";

describe("Verify Rules Transition", () => {
    test.each([
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.BUSY, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.DO_NOT_DISTURB, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.BACK_IN_A_MOMENT, result: true },
        { actualStatus: AvailabilityStatus.ONLINE, futureStatus: AvailabilityStatus.ONLINE, result: true },
        { actualStatus: AvailabilityStatus.BUSY, futureStatus: AvailabilityStatus.DO_NOT_DISTURB, result: true },
        { actualStatus: AvailabilityStatus.BUSY, futureStatus: AvailabilityStatus.JITSI, result: true },
        { actualStatus: AvailabilityStatus.JITSI, futureStatus: AvailabilityStatus.BUSY, result: true },
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
            const isValid: boolean = StatusRules.canChangeStatus(actualStatus).to(futureStatus);
            //Assert
            expect(isValid).toBe(result);
        }
    );
});

describe("Status Rules", () => {
    describe("StatusChanger", () => {
        it("should create an instance of statusStrategy with online Status by default", () => {
            //Arrange
            const mockRulesVerification: StatusRulesVerificationInterface = {
                canChangeStatus: (actualStatus: AvailabilityStatus) => {
                    return {
                        to: vi.fn().mockReturnValueOnce(true),
                    };
                },
            };

            const mockCreateStrategy = vi.fn().mockReturnValueOnce(new BasicStatusStrategy(AvailabilityStatus.BUSY));

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(mockRulesVerification, mockStatusStrategyFactory);
            //Act
            const actualStatus = statusStrategy.getActualStatus();
            //Assert
            expect(actualStatus).toBe(AvailabilityStatus.ONLINE);
        });
        it("should set the status when statusVerification return true", () => {
            //Arrange
            const mockRulesVerification: StatusRulesVerificationInterface = {
                canChangeStatus: (actualStatus: AvailabilityStatus) => {
                    return {
                        to: vi.fn().mockReturnValueOnce(true),
                    };
                },
            };

            const actualStatus = AvailabilityStatus.ONLINE;
            const actualStrategy = new BasicStatusStrategy(actualStatus, [], []);
            const newStatus = AvailabilityStatus.BBB;

            const mockCreateStrategy = vi.fn().mockReturnValueOnce(new BasicStatusStrategy(newStatus));

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(
                mockRulesVerification,
                mockStatusStrategyFactory,
                actualStrategy
            );
            expect(statusStrategy.getActualStatus()).toBe(actualStatus);

            //Act
            statusStrategy.changeStatusTo(newStatus);

            const result = statusStrategy.getActualStatus();

            //Assert
            expect(result).toBe(newStatus);
        });
        it("should return InvalidStatusTransitionError and leave the actual status when statusVerificator return false", () => {
            //Arrange
            const mockTo = vi.fn().mockReturnValueOnce(false);
            const mockRulesVerificator: StatusRulesVerificationInterface = {
                canChangeStatus: (actualStatus: AvailabilityStatus) => {
                    return {
                        to: mockTo,
                    };
                },
            };

            const actualStatus = AvailabilityStatus.ONLINE;
            const actualStrategy = new BasicStatusStrategy(actualStatus, [], []);
            const newStatus = AvailabilityStatus.BBB;

            const mockCreateStrategy = vi.fn().mockReturnValueOnce(new BasicStatusStrategy(newStatus));

            const mockStatusStrategyFactory: StatusStrategyFactoryInterface = {
                createStrategy: mockCreateStrategy,
            };

            const statusStrategy: StatusChanger = new StatusChanger(
                mockRulesVerificator,
                mockStatusStrategyFactory,
                actualStrategy
            );
            expect(statusStrategy.getActualStatus()).toBe(actualStatus);

            //Act
            expect(() => {
                statusStrategy.changeStatusTo(newStatus);
            }).toThrow(InvalidStatusTransitionError);

            const result = statusStrategy.getActualStatus();

            //Assert
            expect(mockTo).toHaveBeenCalledOnce();

            expect(result).toBe(actualStatus);
        });
        it("should apply rules of new status and delete rules of old status when you change status and statusVerificator return true", () => {
            //Arrange

            const mockTo = vi.fn().mockName("to").mockReturnValueOnce(true);
            const mockRulesVerification: StatusRulesVerificationInterface = {
                canChangeStatus: (actualStatus: AvailabilityStatus) => {
                    return {
                        to: mockTo,
                    };
                },
            };

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
                mockRulesVerification,
                mockStatusStrategyFactory,
                mockOldBasicStatusStrategy
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

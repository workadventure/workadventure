import { performance as nodePerformance } from "perf_hooks";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writable } from "svelte/store";
import { ThrottlingDetector, ThrottlingEvent } from "./ThrottlingDetector";

// Ensure global performance exists in Node environment
if (!("performance" in globalThis)) {
    Object.defineProperty(globalThis, "performance", {
        value: nodePerformance,
        configurable: true,
        writable: true,
    });
}

// Mock console.log to avoid noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});

describe("ThrottlingDetector", () => {
    let detector: ThrottlingDetector;
    let mockVisibilityStore: ReturnType<typeof writable<boolean>>;
    let currentTime = 1000; // Start at 1 second
    let performanceNowSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        currentTime = 1000;

        // Spy on performance.now so the detector uses controlled time
        performanceNowSpy = vi.spyOn(globalThis.performance, "now").mockImplementation(() => currentTime);

        // Create a real Svelte writable store for each test
        mockVisibilityStore = writable(false);
    });

    afterEach(() => {
        if (detector) {
            detector.destroy();
        }
        if (performanceNowSpy) {
            performanceNowSpy.mockRestore();
        }
        vi.useRealTimers();
        vi.clearAllTimers();
        // No need to destroy writable, it will be garbage collected
    });

    describe("Initialization", () => {
        it("should initialize with correct default state", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            expect(detector.isThrottled$.value).toBe(false);
            expect(detector.events$).toBeDefined();
            expect(detector.recoveryTriggered$).toBeDefined();
        });

        it("should start detection interval on construction", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            // Verify that setInterval was called
            expect(vi.getTimerCount()).toBe(1);
        });

        it("should setup visibility listener on construction", () => {
            const subscribeSpy = vi.spyOn(mockVisibilityStore, "subscribe");

            detector = new ThrottlingDetector(mockVisibilityStore);

            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            expect(subscribeSpy).toHaveBeenCalledWith(expect.any(Function));
        });

        it("should use default visibilityStore when none provided", () => {
            // This tests the default parameter functionality
            detector = new ThrottlingDetector();

            expect(detector.isThrottled$.value).toBe(false);
            expect(vi.getTimerCount()).toBe(1);
        });
    });

    describe("Throttling Detection", () => {
        it("should detect throttling when delay exceeds threshold", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];

            // Subscribe to events
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Simulate a large delay (greater than 5000ms threshold)
            currentTime = 1000; // Start time
            vi.advanceTimersByTime(1000); // First check

            currentTime = 7000; // Jump forward by 6 seconds (exceeds 5s threshold)
            vi.advanceTimersByTime(1000); // Second check - should detect throttling

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0]).toEqual({
                type: "throttling_detected",
                timestamp: expect.any(Number),
                delay: 6000,
            });

            expect(detector.isThrottled$.value).toBe(true);

            subscription.unsubscribe();
        });

        it("should NOT detect throttling when delay is within normal range", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Simulate normal intervals (1 second each)
            for (let i = 0; i < 5; i++) {
                currentTime += 1000; // Normal 1s increment
                vi.advanceTimersByTime(1000);
            }

            expect(eventsReceived).toHaveLength(0);
            expect(detector.isThrottled$.value).toBe(false);

            subscription.unsubscribe();
        });

        it("should only detect throttling once until recovery", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // First throttling detection
            currentTime = 1000;
            vi.advanceTimersByTime(1000);

            currentTime = 7000; // 6s delay - should trigger
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);

            // Second large delay - should NOT trigger again
            currentTime = 14000; // Another 7s delay
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1); // Still only one event

            subscription.unsubscribe();
        });

        it("should calculate delay correctly", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Simulate specific delay
            currentTime = 2000;
            vi.advanceTimersByTime(1000);

            currentTime = 9500; // 7.5 second delay
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].delay).toBe(7500);

            subscription.unsubscribe();
        });
    });

    describe("Recovery Detection", () => {
        it("should trigger recovery when page becomes visible after throttling", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            let recoverySignalCount = 0;

            const eventsSubscription = detector.events$.subscribe((event: ThrottlingEvent) =>
                eventsReceived.push(event)
            );
            const recoverySubscription = detector.recoveryTriggered$.subscribe(() => {
                recoverySignalCount++;
            });

            // First, trigger throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            expect(detector.isThrottled$.value).toBe(true);
            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            // Now trigger recovery by page becoming visible
            mockVisibilityStore.set(true);

            expect(detector.isThrottled$.value).toBe(false);
            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1]).toEqual({
                type: "recovery_triggered",
                timestamp: expect.any(Number),
            });
            expect(recoverySignalCount).toBe(1);

            eventsSubscription.unsubscribe();
            recoverySubscription.unsubscribe();
        });

        it("should NOT trigger recovery when page becomes visible without prior throttling", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            let recoverySignalCount = 0;

            const eventsSubscription = detector.events$.subscribe((event: ThrottlingEvent) =>
                eventsReceived.push(event)
            );
            const recoverySubscription = detector.recoveryTriggered$.subscribe(() => {
                recoverySignalCount++;
            });

            // Page becomes visible without prior throttling
            mockVisibilityStore.set(true);

            expect(detector.isThrottled$.value).toBe(false);
            expect(eventsReceived).toHaveLength(0);
            expect(recoverySignalCount).toBe(0);

            eventsSubscription.unsubscribe();
            recoverySubscription.unsubscribe();
        });

        it("should allow new throttling detection after recovery", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // First throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            // Recovery
            mockVisibilityStore.set(true);
            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1].type).toBe("recovery_triggered");

            // Second throttling - should be detected again
            currentTime += 1000;
            vi.advanceTimersByTime(1000);
            currentTime += 6000; // Another big delay
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(3);
            expect(eventsReceived[2].type).toBe("throttling_detected");

            subscription.unsubscribe();
        });

        it("should handle recovery when visibility changes multiple times", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Trigger throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            expect(detector.isThrottled$.value).toBe(true);

            // Multiple visibility changes
            mockVisibilityStore.set(false); // Hidden
            mockVisibilityStore.set(true); // Visible - should trigger recovery
            mockVisibilityStore.set(false); // Hidden again
            mockVisibilityStore.set(true); // Visible - should NOT trigger recovery again

            expect(eventsReceived).toHaveLength(2); // Only one recovery event
            expect(eventsReceived[1].type).toBe("recovery_triggered");
            expect(detector.isThrottled$.value).toBe(false);

            subscription.unsubscribe();
        });
    });

    describe("Visibility Store Integration", () => {
        it("should handle visibility changes correctly without throttling", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Page becomes invisible
            mockVisibilityStore.set(false);
            expect(detector.isThrottled$.value).toBe(false);
            expect(eventsReceived).toHaveLength(0);

            // Page becomes visible (no throttling happened)
            mockVisibilityStore.set(true);
            expect(detector.isThrottled$.value).toBe(false);
            expect(eventsReceived).toHaveLength(0);

            subscription.unsubscribe();
        });

        it("should properly subscribe to visibility store", () => {
            const subscribeSpy = vi.spyOn(mockVisibilityStore, "subscribe");

            detector = new ThrottlingDetector(mockVisibilityStore);

            expect(subscribeSpy).toHaveBeenCalledTimes(1);

            // Trigger visibility change to verify callback works
            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // First cause throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            // Then trigger visibility
            mockVisibilityStore.set(true);

            expect(eventsReceived).toHaveLength(2);

            subscription.unsubscribe();
        });
    });

    describe("Resource Management", () => {
        it("should clean up resources when destroyed", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            expect(vi.getTimerCount()).toBe(1);

            detector.destroy();

            expect(vi.getTimerCount()).toBe(0);
        });

        it("should complete all subjects when destroyed", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsCompleted = vi.fn();
            const isThrottledCompleted = vi.fn();
            const recoveryCompleted = vi.fn();

            void detector.events$.subscribe({ complete: eventsCompleted });
            void detector.isThrottled$.subscribe({ complete: isThrottledCompleted });
            void detector.recoveryTriggered$.subscribe({ complete: recoveryCompleted });

            detector.destroy();

            expect(eventsCompleted).toHaveBeenCalledTimes(1);
            expect(isThrottledCompleted).toHaveBeenCalledTimes(1);
            expect(recoveryCompleted).toHaveBeenCalledTimes(1);
        });

        it("should unsubscribe from visibility store when destroyed", () => {
            const unsubscribeSpy = vi.fn();

            // Mock the subscribe method to return our spy
            vi.spyOn(mockVisibilityStore, "subscribe").mockReturnValue(unsubscribeSpy);

            detector = new ThrottlingDetector(mockVisibilityStore);
            detector.destroy();

            expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
        });

        it("should handle multiple destroy calls gracefully", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            expect(() => {
                detector.destroy();
                detector.destroy();
                detector.destroy();
            }).not.toThrow();

            expect(vi.getTimerCount()).toBe(0);
        });

        it("should handle destroy when no visibility subscription exists", () => {
            // Create detector without proper visibility store
            const emptyStore = writable(false);
            detector = new ThrottlingDetector(emptyStore);

            expect(() => detector.destroy()).not.toThrow();
        });

        it("should handle visibility store errors gracefully", () => {
            const errorStore = writable(false);
            // Override subscribe to throw error
            errorStore.subscribe = vi.fn(() => {
                throw new Error("Visibility store error");
            });

            expect(() => {
                detector = new ThrottlingDetector(errorStore);
            }).toThrow("Visibility store error");
        });

        it("should work with different visibility store implementations", () => {
            const customStore = writable(false);

            detector = new ThrottlingDetector(customStore);

            // Just verify the detector was created and works
            expect(detector.isThrottled$.value).toBe(false);
            expect(detector.events$).toBeDefined();

            // Test that it responds to visibility changes
            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Trigger throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            // Test recovery with custom store
            customStore.set(true);

            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1].type).toBe("recovery_triggered");

            subscription.unsubscribe();
        });
    });

    describe("Edge Cases", () => {
        it("should handle very large delays correctly", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Extremely large delay (1 minute)
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 61000;
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");
            expect(eventsReceived[0].delay).toBe(60000);

            subscription.unsubscribe();
        });

        it("should handle time going backwards gracefully", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            currentTime = 5000;
            vi.advanceTimersByTime(1000);

            // Time goes backwards (negative delay)
            currentTime = 1000;
            vi.advanceTimersByTime(1000);

            // Should not trigger throttling detection for negative delays
            expect(eventsReceived).toHaveLength(0);

            subscription.unsubscribe();
        });

        it("should handle rapid interval checks", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Rapid succession of normal intervals
            for (let i = 0; i < 10; i++) {
                currentTime += 1000;
                vi.advanceTimersByTime(1000);
            }

            expect(eventsReceived).toHaveLength(0);
            expect(detector.isThrottled$.value).toBe(false);

            subscription.unsubscribe();
        });
    });

    describe("Threshold Configuration", () => {
        it("should use 5000ms as throttling threshold", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Just under threshold (4999ms)
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 5999; // 4999ms delay - should NOT trigger
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(0);

            // Just over threshold (5001ms)
            currentTime += 1000;
            vi.advanceTimersByTime(1000);
            currentTime += 5001; // 5001ms delay - SHOULD trigger
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            subscription.unsubscribe();
        });

        it("should detect throttling at exactly 5001ms", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 6001; // Exactly 5001ms delay
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].delay).toBe(5001);

            subscription.unsubscribe();
        });
    });

    describe("Real-world Scenarios", () => {
        it("should handle typical browser throttling scenario", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const throttledStates: boolean[] = [];

            const eventsSubscription = detector.events$.subscribe((event: ThrottlingEvent) =>
                eventsReceived.push(event)
            );
            const isThrottledSubscription = detector.isThrottled$.subscribe((state) => throttledStates.push(state));

            // Normal operation for a while
            currentTime = 1000;
            for (let i = 0; i < 5; i++) {
                currentTime += 1000;
                vi.advanceTimersByTime(1000);
            }

            // Browser tab becomes inactive - throttling kicks in
            currentTime += 10000; // 10 second delay
            vi.advanceTimersByTime(1000);

            expect(detector.isThrottled$.value).toBe(true);
            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            // User comes back to tab
            mockVisibilityStore.set(true);

            expect(detector.isThrottled$.value).toBe(false);
            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1].type).toBe("recovery_triggered");

            // Normal operation resumes
            for (let i = 0; i < 3; i++) {
                currentTime += 1000;
                vi.advanceTimersByTime(1000);
            }

            expect(eventsReceived).toHaveLength(2); // No additional events

            eventsSubscription.unsubscribe();
            isThrottledSubscription.unsubscribe();
        });

        it("should handle multiple throttling cycles", () => {
            detector = new ThrottlingDetector(mockVisibilityStore);

            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // === FIRST CYCLE ===
            // Start first cycle
            currentTime = 1000;
            vi.advanceTimersByTime(1000); // First interval check

            // First throttling detection (7s delay)
            currentTime = 8000;
            vi.advanceTimersByTime(1000); // Second interval check - should detect throttling

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");
            expect(detector.isThrottled$.value).toBe(true);

            // First recovery - page becomes visible
            mockVisibilityStore.set(true);
            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1].type).toBe("recovery_triggered");
            expect(detector.isThrottled$.value).toBe(false);

            // === SECOND CYCLE ===
            // Continue time normally after recovery
            currentTime = 9000; // Normal 1s progression
            vi.advanceTimersByTime(1000); // Normal check

            currentTime = 10000; // Another normal 1s
            vi.advanceTimersByTime(1000); // Normal check

            // Now simulate second throttling (big jump) - but first make page invisible
            mockVisibilityStore.set(false); // Page goes invisible (important for recovery logic)

            currentTime = 17000; // 7s delay from last check (10000 + 7000)
            vi.advanceTimersByTime(1000); // This should detect second throttling

            expect(eventsReceived).toHaveLength(3);
            expect(eventsReceived[2].type).toBe("throttling_detected");
            expect(detector.isThrottled$.value).toBe(true);

            // Second recovery - page becomes visible again
            mockVisibilityStore.set(true);
            expect(eventsReceived).toHaveLength(4);
            expect(eventsReceived[3].type).toBe("recovery_triggered");
            expect(detector.isThrottled$.value).toBe(false);

            // Verify all event types
            expect(eventsReceived[0].type).toBe("throttling_detected");
            expect(eventsReceived[1].type).toBe("recovery_triggered");
            expect(eventsReceived[2].type).toBe("throttling_detected");
            expect(eventsReceived[3].type).toBe("recovery_triggered");

            subscription.unsubscribe();
        });
    });

    describe("Constructor Dependency Injection", () => {
        it("should accept custom visibility store", () => {
            const customStore = writable(false);
            const subscribeSpy = vi.spyOn(customStore, "subscribe");

            detector = new ThrottlingDetector(customStore);

            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            expect(detector.isThrottled$.value).toBe(false);

            // No need to destroy writable, it will be garbage collected
        });

        it("should work with different visibility store implementations", () => {
            const customStore = writable(false);

            detector = new ThrottlingDetector(customStore);

            // Just verify the detector was created and works
            expect(detector.isThrottled$.value).toBe(false);
            expect(detector.events$).toBeDefined();

            // Test that it responds to visibility changes
            const eventsReceived: ThrottlingEvent[] = [];
            const subscription = detector.events$.subscribe((event: ThrottlingEvent) => eventsReceived.push(event));

            // Trigger throttling
            currentTime = 1000;
            vi.advanceTimersByTime(1000);
            currentTime = 7000;
            vi.advanceTimersByTime(1000);

            expect(eventsReceived).toHaveLength(1);
            expect(eventsReceived[0].type).toBe("throttling_detected");

            // Test recovery with custom store
            customStore.set(true);

            expect(eventsReceived).toHaveLength(2);
            expect(eventsReceived[1].type).toBe("recovery_triggered");

            subscription.unsubscribe();
        });
    });
});

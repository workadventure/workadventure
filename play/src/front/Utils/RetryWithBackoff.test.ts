import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RetryWithBackoff, MaxRetriesReachedError } from "./RetryWithBackoff";

describe("RetryWithBackoff", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("calculateDelay", () => {
        it("should return initial delay when attempt is 0", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 500,
                backoffMultiplier: 1.2,
            });

            // Act
            const delay = retry.calculateDelay(0);

            // Assert
            expect(delay).toBe(500);
        });

        it("should apply exponential backoff for subsequent attempts", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 500,
                backoffMultiplier: 2,
                maxDelayMs: 100000,
            });

            // Act & Assert
            expect(retry.calculateDelay(0)).toBe(500);
            expect(retry.calculateDelay(1)).toBe(1000);
            expect(retry.calculateDelay(2)).toBe(2000);
            expect(retry.calculateDelay(3)).toBe(4000);
        });

        it("should cap delay at maxDelayMs when exponential exceeds it", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 500,
                backoffMultiplier: 2,
                maxDelayMs: 15000,
            });

            // Act
            const delay = retry.calculateDelay(10);

            // Assert
            expect(delay).toBe(15000);
        });

        it("should reach 15 seconds cap with default settings around attempt 20", () => {
            // Arrange
            const retry = new RetryWithBackoff();

            // Act
            const delayAt15 = retry.calculateDelay(15);
            const delayAt20 = retry.calculateDelay(20);
            const delayAt25 = retry.calculateDelay(25);

            // Assert
            expect(delayAt15).toBeLessThan(15000);
            expect(delayAt20).toBe(15000);
            expect(delayAt25).toBe(15000);
        });
    });

    describe("scheduleRetry", () => {
        it("should schedule callback with correct delay for first attempt", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 500,
            });
            const callback = vi.fn();

            // Act
            retry.scheduleRetry("user-1", callback);

            // Assert
            expect(callback).not.toHaveBeenCalled();
            vi.advanceTimersByTime(499);
            expect(callback).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it("should increment attempt count with each retry", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback = vi.fn();

            // Act & Assert
            expect(retry.getAttemptCount("user-1")).toBe(0);

            retry.scheduleRetry("user-1", callback);
            expect(retry.getAttemptCount("user-1")).toBe(1);

            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);
            expect(retry.getAttemptCount("user-1")).toBe(2);
        });

        it("should use exponential backoff delay for subsequent retries", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
                backoffMultiplier: 2,
                maxDelayMs: 10000,
            });
            const callback = vi.fn();

            // Act - First retry (attempt 1)
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            expect(callback).toHaveBeenCalledTimes(1);

            // Act - Second retry (attempt 2, delay should be 200ms)
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(199);
            expect(callback).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalledTimes(2);

            // Act - Third retry (attempt 3, delay should be 400ms)
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(399);
            expect(callback).toHaveBeenCalledTimes(2);
            vi.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalledTimes(3);
        });

        it("should return true when retry is scheduled successfully", () => {
            // Arrange
            const retry = new RetryWithBackoff({ maxAttempts: 30 });
            const callback = vi.fn();

            // Act
            const result = retry.scheduleRetry("user-1", callback);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when max retries reached", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                maxAttempts: 3,
                initialDelayMs: 10,
            });
            const callback = vi.fn();

            // Schedule 3 retries
            for (let i = 0; i < 3; i++) {
                retry.scheduleRetry("user-1", callback);
                vi.advanceTimersByTime(100);
            }

            // Act - 4th attempt should fail
            const result = retry.scheduleRetry("user-1", callback);

            // Assert
            expect(result).toBe(false);
        });

        it("should call onMaxRetriesReached callback when max attempts exceeded", () => {
            // Arrange
            const onMaxRetriesReached = vi.fn();
            const retry = new RetryWithBackoff({
                maxAttempts: 2,
                initialDelayMs: 10,
                onMaxRetriesReached,
            });
            const callback = vi.fn();

            // Schedule 2 retries
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);

            // Act - 3rd attempt should trigger callback
            retry.scheduleRetry("user-1", callback);

            // Assert
            expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
        });

        it("should track multiple identifiers independently", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            // Act
            retry.scheduleRetry("user-1", callback1);
            retry.scheduleRetry("user-2", callback2);
            retry.scheduleRetry("user-1", callback1);

            // Assert
            expect(retry.getAttemptCount("user-1")).toBe(2);
            expect(retry.getAttemptCount("user-2")).toBe(1);
        });

        it("should clear previous timeout when scheduling new retry for same identifier", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
                backoffMultiplier: 1, // Use constant delay to simplify test
            });
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            // Act
            retry.scheduleRetry("user-1", callback1);
            vi.advanceTimersByTime(50);
            retry.scheduleRetry("user-1", callback2);
            vi.advanceTimersByTime(100);

            // Assert - only second callback should be called
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });
    });

    describe("cancel", () => {
        it("should cancel pending retry and reset attempt count", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);

            // Act
            retry.cancel("user-1");
            vi.advanceTimersByTime(200);

            // Assert
            expect(callback).not.toHaveBeenCalled();
            expect(retry.getAttemptCount("user-1")).toBe(0);
            expect(retry.hasPendingRetry("user-1")).toBe(false);
        });

        it("should remove identifier from failed identifiers when cancelled", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                maxAttempts: 1,
                initialDelayMs: 10,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);

            expect(retry.hasReachedMaxRetries("user-1")).toBe(true);

            // Act
            retry.cancel("user-1");

            // Assert
            expect(retry.hasReachedMaxRetries("user-1")).toBe(false);
        });
    });

    describe("cancelAll", () => {
        it("should cancel all pending retries and reset all state", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            retry.scheduleRetry("user-1", callback1);
            retry.scheduleRetry("user-2", callback2);

            // Act
            retry.cancelAll();
            vi.advanceTimersByTime(200);

            // Assert
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
            expect(retry.getAttemptCount("user-1")).toBe(0);
            expect(retry.getAttemptCount("user-2")).toBe(0);
        });
    });

    describe("resetAttempts", () => {
        it("should reset attempt count to 0 for identifier", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 10,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);
            retry.scheduleRetry("user-1", callback);
            retry.scheduleRetry("user-1", callback);
            expect(retry.getAttemptCount("user-1")).toBe(3);

            // Act
            retry.resetAttempts("user-1");

            // Assert
            expect(retry.getAttemptCount("user-1")).toBe(0);
        });

        it("should cancel pending timeout when resetting", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);

            // Act
            retry.resetAttempts("user-1");
            vi.advanceTimersByTime(200);

            // Assert
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("hasReachedMaxRetries", () => {
        it("should return false when attempts are below max", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                maxAttempts: 30,
                initialDelayMs: 10,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);

            // Act
            const result = retry.hasReachedMaxRetries("user-1");

            // Assert
            expect(result).toBe(false);
        });

        it("should return true when max retries exceeded", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                maxAttempts: 2,
                initialDelayMs: 10,
            });
            const callback = vi.fn();

            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);

            // Act
            const result = retry.hasReachedMaxRetries("user-1");

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("getFailedIdentifiers", () => {
        it("should return empty set when no failures", () => {
            // Arrange
            const retry = new RetryWithBackoff();

            // Act
            const result = retry.getFailedIdentifiers();

            // Assert
            expect(result.size).toBe(0);
        });

        it("should return all identifiers that reached max retries", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                maxAttempts: 1,
                initialDelayMs: 10,
            });
            const callback = vi.fn();

            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-1", callback);

            retry.scheduleRetry("user-2", callback);
            vi.advanceTimersByTime(100);
            retry.scheduleRetry("user-2", callback);

            // Act
            const result = retry.getFailedIdentifiers();

            // Assert
            expect(result.has("user-1")).toBe(true);
            expect(result.has("user-2")).toBe(true);
            expect(result.size).toBe(2);
        });
    });

    describe("hasPendingRetry", () => {
        it("should return true when retry is pending", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);

            // Act
            const result = retry.hasPendingRetry("user-1");

            // Assert
            expect(result).toBe(true);
        });

        it("should return false after retry executes", () => {
            // Arrange
            const retry = new RetryWithBackoff({
                initialDelayMs: 100,
            });
            const callback = vi.fn();
            retry.scheduleRetry("user-1", callback);
            vi.advanceTimersByTime(100);

            // Act
            const result = retry.hasPendingRetry("user-1");

            // Assert
            expect(result).toBe(false);
        });

        it("should return false for unknown identifier", () => {
            // Arrange
            const retry = new RetryWithBackoff();

            // Act
            const result = retry.hasPendingRetry("unknown");

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("getMaxAttempts", () => {
        it("should return configured max attempts", () => {
            // Arrange
            const retry = new RetryWithBackoff({ maxAttempts: 30 });

            // Act
            const result = retry.getMaxAttempts();

            // Assert
            expect(result).toBe(30);
        });

        it("should return default 30 when not configured", () => {
            // Arrange
            const retry = new RetryWithBackoff();

            // Act
            const result = retry.getMaxAttempts();

            // Assert
            expect(result).toBe(30);
        });
    });

    describe("getMaxDelayMs", () => {
        it("should return configured max delay", () => {
            // Arrange
            const retry = new RetryWithBackoff({ maxDelayMs: 15000 });

            // Act
            const result = retry.getMaxDelayMs();

            // Assert
            expect(result).toBe(15000);
        });

        it("should return default 15000 when not configured", () => {
            // Arrange
            const retry = new RetryWithBackoff();

            // Act
            const result = retry.getMaxDelayMs();

            // Assert
            expect(result).toBe(15000);
        });
    });

    describe("30 attempts scenario", () => {
        it("should execute exactly 30 retries before triggering onMaxRetriesReached", () => {
            // Arrange
            const onMaxRetriesReached = vi.fn();
            const retry = new RetryWithBackoff({
                maxAttempts: 30,
                initialDelayMs: 10,
                maxDelayMs: 100,
                onMaxRetriesReached,
            });
            const callback = vi.fn();

            // Act - Schedule 30 successful retries
            for (let i = 0; i < 30; i++) {
                const result = retry.scheduleRetry("user-1", callback);
                expect(result).toBe(true);
                vi.advanceTimersByTime(200);
            }

            expect(callback).toHaveBeenCalledTimes(30);
            expect(onMaxRetriesReached).not.toHaveBeenCalled();

            // 31st attempt should fail and trigger callback
            const result = retry.scheduleRetry("user-1", callback);

            // Assert
            expect(result).toBe(false);
            expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
        });
    });

    describe("MaxRetriesReachedError", () => {
        it("should contain attempt count and identifier", () => {
            // Arrange & Act
            const error = new MaxRetriesReachedError(30, "user-123");

            // Assert
            expect(error.attemptCount).toBe(30);
            expect(error.identifier).toBe("user-123");
            expect(error.name).toBe("MaxRetriesReachedError");
            expect(error.message).toBe("Max retries reached (30) for identifier: user-123");
        });
    });
});

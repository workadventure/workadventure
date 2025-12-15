import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock EasyStar to avoid external dependencies
const { mockEasyStar, EasyStarConstructor } = vi.hoisted(() => {
    const mockEasyStar = {
        findPath: vi.fn(),
        calculate: vi.fn(),
        cancelPath: vi.fn(),
        setGrid: vi.fn(),
        setAcceptableTiles: vi.fn(),
        enableDiagonals: vi.fn(),
        disableCornerCutting: vi.fn(),
        setTileCost: vi.fn(),
        setIterationsPerCalculation: vi.fn(),
    };

    const EasyStarConstructor = vi.fn(function EasyStarMock() {
        return mockEasyStar;
    });

    return { mockEasyStar, EasyStarConstructor };
});

vi.mock("easystarjs", () => ({
    js: EasyStarConstructor,
}));

// Mock character constants
vi.mock("../../../src/front/Phaser/Entity/Character", () => ({
    CHARACTER_BODY_HEIGHT: 16,
    CHARACTER_BODY_OFFSET_X: 0,
    CHARACTER_BODY_OFFSET_Y: 0,
}));

// Mock math utils
vi.mock("@workadventure/math-utils", () => ({
    MathUtils: {
        distanceBetween: vi.fn((a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)),
        isBetween: vi.fn((value, min, max) => value >= min && value < max),
    },
}));

import { PathfindingManager } from "../../../src/front/Utils/PathfindingManager";

describe("PathfindingManager", () => {
    let pathfindingManager: PathfindingManager;
    let mockGrid: number[][];
    const tileDimensions = { width: 32, height: 32 };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the mock implementation
        mockEasyStar.findPath.mockReturnValue(1); // Return instance ID

        // Create a simple 5x5 grid with some obstacles
        mockGrid = [
            [0, 0, 0, 0, 0], // 0 = walkable
            [0, 1, 1, 1, 0], // 1 = collider
            [0, 0, 0, 1, 0],
            [0, 1, 0, 1, 0],
            [0, 0, 0, 0, 0],
        ];
        pathfindingManager = new PathfindingManager(mockGrid, tileDimensions);
    });

    afterEach(() => {
        pathfindingManager.cleanup();
        vi.clearAllMocks();
    });

    describe("Basic pathfinding functionality", () => {
        it("should find a simple path between two walkable points", async () => {
            const start = { x: 16, y: 16 }; // Center of tile (0,0)
            const end = { x: 16, y: 144 }; // Center of tile (0,4)

            // Mock a successful path result
            mockEasyStar.findPath.mockImplementation((sx, sy, ex, ey, callback) => {
                // Simulate async callback with a simple path
                setTimeout(() => {
                    callback([
                        { x: sx, y: sy },
                        { x: sx, y: sy + 1 },
                        { x: ex, y: ey },
                    ]);
                }, 10);
                return 1; // instance ID
            });

            const path = await pathfindingManager.findPathFromGameCoordinates(start, end);

            expect(path.length).toBeGreaterThan(0);
            expect(mockEasyStar.findPath).toHaveBeenCalled();
            expect(mockEasyStar.calculate).toHaveBeenCalled();
        });

        it("should return empty path when no path exists", async () => {
            const start = { x: 16, y: 16 }; // Center of tile (0,0)
            const end = { x: 144, y: 48 }; // Center of tile (4,1) - blocked by walls

            // Mock no path found
            mockEasyStar.findPath.mockImplementation((sx, sy, ex, ey, callback) => {
                setTimeout(() => callback(null), 10);
                return 1; // instance ID
            });

            const path = await pathfindingManager.findPathFromGameCoordinates(start, end);

            expect(path).toEqual([]);
        });

        it("should find alternative path when exact target is blocked", async () => {
            const start = { x: 16, y: 16 }; // Center of tile (0,0)
            const end = { x: 48, y: 48 }; // Center of tile (1,1) - blocked

            // Mock finding a path to alternative target
            mockEasyStar.findPath.mockImplementation((sx, sy, ex, ey, callback) => {
                setTimeout(() => {
                    callback([
                        { x: sx, y: sy },
                        { x: ex + 32, y: ey }, // Alternative nearby position
                    ]);
                }, 10);
                return 1; // instance ID
            });

            const path = await pathfindingManager.findPathFromGameCoordinates(start, end, true);

            // Should find a path to a nearby walkable tile
            expect(path.length).toBeGreaterThan(0);
        });
    });

    describe("Multiple concurrent pathfinding requests - cancellation behavior", () => {
        it("should cancel previous pathfinding when new request is made", async () => {
            const start = { x: 16, y: 16 };
            const end1 = { x: 144, y: 16 };
            const end2 = { x: 16, y: 144 };

            // First pathfinding request - should be canceled
            mockEasyStar.findPath.mockImplementationOnce((sx, sy, ex, ey, callback) => {
                setTimeout(() => {
                    callback([
                        { x: sx, y: sy },
                        { x: ex, y: ey },
                    ]);
                }, 50);
                return 1; // instance ID
            });

            // Start first request
            const firstPromise = pathfindingManager.findPathFromGameCoordinates(start, end1);

            // Second pathfinding request - should succeed
            mockEasyStar.findPath.mockImplementationOnce((sx, sy, ex, ey, callback) => {
                setTimeout(() => {
                    callback([
                        { x: sx, y: sy },
                        { x: ex, y: ey },
                    ]);
                }, 10);
                return 2; // instance ID
            });

            // Start second request quickly after first
            setTimeout(() => {
                void pathfindingManager.findPathFromGameCoordinates(start, end2);
            }, 5);

            await firstPromise;

            // Verify that cancelPath was called for the first request
            expect(mockEasyStar.cancelPath).toHaveBeenCalledWith(1);
        });

        it("should handle rapid successive pathfinding requests without memory leaks", async () => {
            const start = { x: 16, y: 16 };

            // Mock quick responses
            mockEasyStar.findPath.mockImplementation((sx, sy, ex, ey, callback) => {
                setTimeout(
                    () =>
                        callback([
                            { x: sx, y: sy },
                            { x: ex, y: ey },
                        ]),
                    1
                );
                return Math.random(); // different instance IDs
            });

            // Fire multiple requests in quick succession
            const promises: Promise<{ x: number; y: number }[]>[] = [];
            for (let i = 0; i < 5; i++) {
                const end = { x: 16 + i * 32, y: 144 };
                promises.push(pathfindingManager.findPathFromGameCoordinates(start, end));
            }

            const results = await Promise.all(promises);

            // Should complete without throwing errors
            expect(results).toHaveLength(5);
            // cancelPath should have been called for intermediate requests
            expect(mockEasyStar.cancelPath).toHaveBeenCalled();
        });
    });

    describe("Timeout and edge cases", () => {
        it("should timeout when pathfinding takes too long", async () => {
            const start = { x: 16, y: 16 };
            const end = { x: 144, y: 144 };

            // Mock a pathfinding that never calls the callback
            mockEasyStar.findPath.mockImplementation(() => {
                // Never call callback - simulate stuck pathfinding
                return 1;
            });

            const startTime = Date.now();
            const path = await pathfindingManager.findPathFromGameCoordinates(start, end);
            const endTime = Date.now();

            // Should timeout and return empty path
            expect(path).toEqual([]);
            expect(endTime - startTime).toBeLessThan(5000); // Should timeout in under 5 seconds
            expect(mockEasyStar.cancelPath).toHaveBeenCalledWith(1);
        });

        it("should handle same start and end positions", async () => {
            const position = { x: 16, y: 16 };

            mockEasyStar.findPath.mockImplementation((sx, sy, ex, ey, callback) => {
                setTimeout(() => callback([{ x: sx, y: sy }]), 10);
                return 1;
            });

            const path = await pathfindingManager.findPathFromGameCoordinates(position, position);

            // Should return single point or empty path
            expect(path.length).toBeLessThanOrEqual(1);
        });

        it("should properly cleanup when cleanup() is called", () => {
            const start = { x: 16, y: 16 };
            const end = { x: 144, y: 144 };

            // Start a pathfinding operation
            mockEasyStar.findPath.mockImplementation(() => 1);
            void pathfindingManager.findPathFromGameCoordinates(start, end);

            // Call cleanup
            pathfindingManager.cleanup();

            // Should have canceled the pathfinding
            expect(mockEasyStar.cancelPath).toHaveBeenCalledWith(1);
        });
    });

    describe("Maximum calculation limit", () => {
        it("should stop after maximum calculations and return empty path", async () => {
            const start = { x: 16, y: 16 };
            const end = { x: 144, y: 144 };

            let calculateCallCount = 0;
            mockEasyStar.calculate.mockImplementation(() => {
                calculateCallCount++;
            });

            // Mock pathfinding that never finds a path
            mockEasyStar.findPath.mockImplementation(() => {
                // Never call callback to simulate no path found
                return 1;
            });

            const path = await pathfindingManager.findPathFromGameCoordinates(start, end);

            // Should return empty path due to max calculations reached
            expect(path).toEqual([]);
            expect(calculateCallCount).toBeGreaterThan(0);
            expect(mockEasyStar.cancelPath).toHaveBeenCalledWith(1);
        });
    });
});

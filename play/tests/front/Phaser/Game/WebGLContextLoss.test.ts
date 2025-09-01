// Simple test to verify WebGL context loss handling functionality
// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

// Mock environment variables
vi.mock("../../../../src/front/Enum/EnvironmentVariable.ts", () => ({
    SKIP_RENDER_OPTIMIZATIONS: false,
    DEBUG_MODE: false,
}));

describe("WebGL Context Loss Implementation", () => {
    it("should have the correct event constants available", () => {
        // Verify that Phaser constants exist (this ensures our imports are correct)
        expect(typeof Phaser.Core.Events.CONTEXT_LOST).toBe("string");
        expect(typeof Phaser.Renderer.Events.LOSE_WEBGL).toBe("string");
        expect(typeof Phaser.Renderer.Events.RESTORE_WEBGL).toBe("string");
    });

    it("should be able to import the Game class with WebGL context handling", async () => {
        // This test verifies that our Game class can be imported without issues
        const { Game } = await import("../../../../src/front/Phaser/Game/Game");
        expect(Game).toBeDefined();
        expect(typeof Game).toBe("function");
    });
});

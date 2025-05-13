import { describe, expect, it } from "vitest";
import { EnvironmentVariables } from "../src/Enum/EnvironmentVariableValidator";

describe("EnvironmentVariable", () => {
    it("should validate properly URLs", () => {
        let result = EnvironmentVariables.safeParse({
            PLAY_URL: "https://example.com",
        });
        expect(result.success).toBe(true);

        result = EnvironmentVariables.safeParse({
            PLAY_URL: "https://12.12.12.12",
        });
        expect(result.success).toBe(true);

        result = EnvironmentVariables.safeParse({
            PLAY_URL: "https://12.12.12.12",
            ADMIN_API_URL: "",
        });
        expect(result.success).toBe(true);
    });
});

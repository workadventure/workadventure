import { Status } from "@grpc/grpc-js/build/src/constants";
import { describe, expect, vi, beforeAll, it } from "vitest";
import { Metadata } from "@grpc/grpc-js";
import AuthenticationGuard from "../../../src/room-api/guards/AuthenticationGuard";
import { GuardError } from "../../../src/room-api/types/GuardError";

describe("AuthenticationGuard", () => {
    beforeAll(() => {
        vi.mock("../../../src/pusher/enums/EnvironmentVariable", () => {
            return {
                ADMIN_API_URL: "https://workadventure.localhost",
            };
        });

        vi.mock("../../../src/room-api/authentication/AdminAuthenticator", () => {
            return {
                default: () => {
                    return new Promise((resolve) => {
                        resolve({ success: true });
                        return;
                    });
                },
            };
        });
    });

    it("should be return an undefined token error", async () => {
        const metadata = new Metadata();

        let thrownError: unknown;

        try {
            await AuthenticationGuard(metadata, "http://room-url.re");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.UNAUTHENTICATED);
            expect(thrownError.details).toEqual("X-API-Key metadata not defined!");
        }
    });

    it("should be authenticated", async () => {
        const metadata = new Metadata();
        metadata.set("X-API-Key", "MYAWESOMEKEY");
        await expect(AuthenticationGuard(metadata, "http://room-url.re")).resolves.not.toThrow();
    });
});

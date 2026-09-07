import { describe, expect, it } from "vitest";
import { DesktopOidcTransactionService } from "./DesktopOidcTransactionService";

describe("DesktopOidcTransactionService", () => {
    it("exchanges memory fallback desktop OIDC transactions only once", async () => {
        let now = 1_000;
        const service = new DesktopOidcTransactionService({
            getRedisClient: () => Promise.resolve(null),
            now: () => now,
        });

        await service.createDesktopOidcTransaction("oidc-state", {
            playUri: "https://play.workadventu.re/@/team/world/room",
            codeVerifier: "code-verifier",
            callbackUrl: "http://127.0.0.1:48919/auth/callback",
        });

        await expect(service.exchangeDesktopOidcTransaction("oidc-state")).resolves.toEqual({
            playUri: "https://play.workadventu.re/@/team/world/room",
            codeVerifier: "code-verifier",
            callbackUrl: "http://127.0.0.1:48919/auth/callback",
            desktop: true,
        });
        await expect(service.exchangeDesktopOidcTransaction("oidc-state")).resolves.toBeUndefined();

        await service.createDesktopOidcTransaction("expired-state", {
            playUri: "https://play.workadventu.re/@/team/world/expired",
            codeVerifier: "expired-code-verifier",
        });
        now += 601_000;

        await expect(service.exchangeDesktopOidcTransaction("expired-state")).resolves.toBeUndefined();
    });

    it("stores desktop OIDC transactions in Redis with a short TTL", async () => {
        const values = new Map<string, string>();
        const expirations = new Map<string, number>();
        const service = new DesktopOidcTransactionService({
            getRedisClient: () =>
                Promise.resolve({
                    set: (key: string, value: string, options: { EX: number }) => {
                        values.set(key, value);
                        expirations.set(key, options.EX);
                        return Promise.resolve();
                    },
                    get: (key: string) => Promise.resolve(values.get(key) ?? null),
                    del: (key: string) => {
                        values.delete(key);
                        return Promise.resolve();
                    },
                }) as never,
        });

        await service.createDesktopOidcTransaction("redis-state", {
            playUri: "https://play.workadventu.re/@/team/world/room",
            codeVerifier: "code-verifier",
            callbackUrl: "http://127.0.0.1:48919/auth/callback",
        });

        expect(expirations.get("desktop-oidc:redis-state")).toBe(600);
        await expect(service.exchangeDesktopOidcTransaction("redis-state")).resolves.toEqual({
            playUri: "https://play.workadventu.re/@/team/world/room",
            codeVerifier: "code-verifier",
            callbackUrl: "http://127.0.0.1:48919/auth/callback",
            desktop: true,
        });
        expect(values.has("desktop-oidc:redis-state")).toBe(false);
    });
});

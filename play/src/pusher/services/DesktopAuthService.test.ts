import { describe, expect, it } from "vitest";
import { DesktopAuthService } from "./DesktopAuthService";

describe("DesktopAuthService", () => {
    it("exchanges memory fallback desktop auth codes only once", async () => {
        let now = 1_000;
        const service = new DesktopAuthService({
            getRedisClient: () => Promise.resolve(null),
            now: () => now,
            randomCode: () => "desktop-code",
        });

        const code = await service.createDesktopAuthCode({
            token: "auth-token",
            targetUrl: "https://play.workadventu.re/@/team/world/room",
        });

        expect(code).toBe("desktop-code");
        await expect(service.exchangeDesktopAuthCode(code)).resolves.toEqual({
            token: "auth-token",
            targetUrl: "https://play.workadventu.re/@/team/world/room",
        });
        await expect(service.exchangeDesktopAuthCode(code)).resolves.toBeUndefined();

        const expiredCode = await service.createDesktopAuthCode({
            token: "expired-token",
            targetUrl: "https://play.workadventu.re/@/team/world/expired",
        });
        now += 301_000;

        await expect(service.exchangeDesktopAuthCode(expiredCode)).resolves.toBeUndefined();
    });

    it("stores desktop auth codes in Redis with a short TTL", async () => {
        const values = new Map<string, string>();
        const expirations = new Map<string, number>();
        const service = new DesktopAuthService({
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
            randomCode: () => "redis-code",
        });

        const code = await service.createDesktopAuthCode({
            token: "auth-token",
            targetUrl: "https://play.workadventu.re/@/team/world/room",
        });

        expect(code).toBe("redis-code");
        expect(expirations.get("desktop-auth:redis-code")).toBe(300);
        await expect(service.exchangeDesktopAuthCode(code)).resolves.toEqual({
            token: "auth-token",
            targetUrl: "https://play.workadventu.re/@/team/world/room",
        });
        expect(values.has("desktop-auth:redis-code")).toBe(false);
    });
});

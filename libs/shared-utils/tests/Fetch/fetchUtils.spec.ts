import { describe, expect, it } from "vitest";
import type { HttpError } from "../../src/Fetch/fetchUtils";
import { assertResponseOk } from "../../src/Fetch/fetchUtils";

describe("fetchUtils", () => {
    describe("assertResponseOk", () => {
        it("should return the response when it is ok", async () => {
            const response = new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                },
            });

            await expect(assertResponseOk(response)).resolves.toBe(response);
        });

        it("should throw an HttpError when the response is not ok", async () => {
            const response = new Response("Service unavailable", {
                status: 503,
                statusText: "Service Unavailable",
            });

            try {
                await assertResponseOk(response);
                expect.unreachable();
            } catch (error) {
                const httpError = error as HttpError;

                expect(httpError.name).toBe("HttpError");
                expect(httpError.message).toBe("Request failed with status 503 Service Unavailable");
                expect(httpError.status).toBe(503);
                expect(httpError.statusText).toBe("Service Unavailable");
                expect(httpError.url).toBe("");
                expect(httpError.body).toBe("Service unavailable");
                expect(httpError.fullBody).toBe("Service unavailable");
            }
        });

        it("should keep a trimmed preview body and retain the full body", async () => {
            const longBody = "a".repeat(3_000);
            const response = new Response(longBody, {
                status: 503,
                statusText: "Service Unavailable",
            });

            try {
                await assertResponseOk(response);
                expect.unreachable();
            } catch (error) {
                const httpError = error as HttpError;

                expect(httpError.body).toHaveLength(2_048);
                expect(httpError.body).toBe(longBody.slice(0, 2_048));
                expect(httpError.fullBody).toBe(longBody);
            }
        });
    });
});

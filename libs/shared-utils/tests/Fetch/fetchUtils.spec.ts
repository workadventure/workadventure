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

            await expect(assertResponseOk(response)).rejects.toEqual(
                expect.objectContaining<HttpError>({
                    name: "HttpError",
                    message: "Request failed with status 503 Service Unavailable",
                    status: 503,
                    statusText: "Service Unavailable",
                    url: "",
                    body: "Service unavailable",
                })
            );
        });
    });
});

import { Status } from "@grpc/grpc-js/build/src/constants";
import { describe, test, expect, vi, beforeAll, it } from "vitest";
import { AxiosInstance } from "axios";
import { CacheOptions } from "axios-cache-interceptor";
import authenticator from "../../../src/room-api/authentication/AdminAuthenticator";
import { GuardError } from "../../../src/room-api/types/GuardError";

const roomUrl =
    "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";
const apiKey = "MYAWESOMEKEY";

describe("AdminAuthenticator", () => {
    beforeAll(() => {
        vi.mock("../../../src/pusher/enums/EnvironmentVariable", () => {
            return {
                ADMIN_API_URL: "https://workadventure.localhost",
            };
        });

        vi.mock("axios-cache-interceptor", () => {
            return {
                setupCache: (instance: AxiosInstance, options: CacheOptions = {}) => ({
                    get: (
                        _url: string,
                        options: {
                            headers?: { "X-API-Key": string };
                            params?: { roomUrl: string };
                        }
                    ) => {
                        return new Promise((resolve, reject) => {
                            if (!options.headers || !options.headers["X-API-Key"]) {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 401,
                                        data: "X-API-Key header not found",
                                    },
                                });
                                return;
                            }

                            if (!options.params || !options.params.roomUrl) {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 400,
                                        data: "roomUrl parameter not found",
                                    },
                                });
                                return;
                            }

                            if (options.headers["X-API-Key"] !== apiKey) {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 401,
                                        data: "Unknown API key",
                                    },
                                });
                                return;
                            }

                            if (options.params.roomUrl === roomUrl + "weird-return") {
                                resolve({
                                    status: 200,
                                    data: {
                                        success: false,
                                    },
                                });
                                return;
                            } else if (options.params.roomUrl === roomUrl + "internal-error") {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 500,
                                        data: "Internal error! Please contact us!",
                                    },
                                });
                                return;
                            } else if (options.params.roomUrl === roomUrl + "undefined") {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 404,
                                        data: "Room not found",
                                    },
                                });
                                return;
                            } else if (options.params.roomUrl !== roomUrl) {
                                // eslint-disable-next-line prefer-promise-reject-errors,@typescript-eslint/prefer-promise-reject-errors
                                reject({
                                    response: {
                                        status: 403,
                                        data: "You cannot interact with this room!",
                                    },
                                });
                                return;
                            }

                            resolve({
                                status: 200,
                                data: {
                                    success: true,
                                },
                            });
                            return;
                        });
                    },
                }),
            };
        });

        vi.mock("axios", () => {
            return {
                isAxiosError: (error: unknown) => {
                    return error !== null && error !== undefined && typeof error === "object" && "response" in error;
                },
                default: {},
            };
        });
    });

    test("with wrong api key", async () => {
        let thrownError: unknown;

        try {
            await authenticator("bad key", roomUrl);
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.UNAUTHENTICATED);
            expect(thrownError.details).toEqual("Unknown API key");
        }
    });

    test("with good api key but wrong room url", async () => {
        let thrownError: unknown;

        try {
            await authenticator(apiKey, "http://baddomain.fr/_/test/myroom");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.PERMISSION_DENIED);
            expect(thrownError.details).toEqual("You cannot interact with this room!");
        }
    });

    test("a weird success status has been returned", async () => {
        let thrownError: unknown;

        try {
            await authenticator(apiKey, roomUrl + "weird-return");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.INTERNAL);
            expect(thrownError.details).toEqual("Unexpected error! Please contact us!");
        }
    });

    test("an internal error has been throw", async () => {
        let thrownError: unknown;

        try {
            await authenticator(apiKey, roomUrl + "internal-error");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.INTERNAL);
            expect(thrownError.details).toEqual("Internal error! Please contact us!");
        }
    });

    test("with a not existing room", async () => {
        let thrownError: unknown;

        try {
            await authenticator(apiKey, roomUrl + "undefined");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.NOT_FOUND);
            expect(thrownError.details).toEqual("Room not found");
        }
    });

    it("should be authenticated", async () => {
        await expect(authenticator(apiKey, roomUrl)).resolves.not.toThrow();
    });
});

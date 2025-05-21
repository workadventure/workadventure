/*eslint-disable @typescript-eslint/no-explicit-any*/

import { PassThrough } from "node:stream";
import { Metadata } from "@grpc/grpc-js";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { describe, test, expect, vi, beforeAll, it, beforeEach } from "vitest";
import { ServerUnaryCallImpl, ServerWritableStreamImpl } from "@grpc/grpc-js/build/src/server-call";
import { SaveVariableRequest, VariableRequest } from "@workadventure/messages";
import RoomApiServer from "../../src/room-api/RoomApiServer";
import { GuardError } from "../../src/room-api/types/GuardError";

let readableCall = new PassThrough();
let readableResponse = new PassThrough();

describe("RoomApiServer", () => {
    beforeAll(() => {
        vi.mock("../../src/room-api/guards/AuthenticationGuard", () => {
            return {
                default: (metadata: Metadata, _room: string) => {
                    return new Promise<void>((resolve, reject) => {
                        if (metadata.get("x-api-key")[0] !== "MYAWESOMEKEY") {
                            reject(new GuardError(Status.UNAUTHENTICATED, "X-API-Key metadata not defined!"));
                            return;
                        }

                        resolve();
                        return;
                    });
                },
            };
        });

        vi.mock("../../src/pusher/services/ApiClientRepository", () => ({
            apiClientRepository: {
                getClient: (clientId: string) => {
                    return new Promise((resolve, reject) => {
                        if (clientId.endsWith("invalid")) {
                            reject(new Error("Invalid client"));
                            return;
                        }

                        resolve({
                            readVariable: (request: VariableRequest, callback: (error: any, response: any) => void) => {
                                if (
                                    request.room ===
                                        "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json" &&
                                    request.name === "test"
                                ) {
                                    return callback(null, "Test Value");
                                }

                                return callback(
                                    {
                                        code: Status.NOT_FOUND,
                                        message: "Variable not found",
                                    },
                                    null
                                );
                            },
                            saveVariable: (
                                request: SaveVariableRequest,
                                callback: (error: any, response: any) => void
                            ) => {
                                if (
                                    request.room ===
                                        "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json" &&
                                    request.name === "test"
                                ) {
                                    return callback(null, null);
                                }

                                return callback(
                                    {
                                        code: Status.NOT_FOUND,
                                        message: "Variable not found",
                                    },
                                    null
                                );
                            },
                            listenVariable: (request: VariableRequest) => {
                                return readableResponse;
                            },
                        });
                    });
                },
            },
        }));
    });

    beforeEach(() => {
        readableCall.destroy();
        readableCall = new PassThrough();
        readableResponse.destroy();
        readableResponse = new PassThrough();
    });

    describe("readVariable", () => {
        test("with the authentication guard on error", () => {
            const metadata = new Metadata();
            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<VariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error.code).toEqual(Status.UNAUTHENTICATED);
                expect(error.details).toEqual("X-API-Key metadata not defined!");
            };

            RoomApiServer.readVariable(call, callback);
        });

        test("with the api client repository returning an error", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "invalid",
                    name: "test",
                } satisfies VariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<VariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error.code).toEqual(Status.INTERNAL);
                expect(error.details).toEqual("Internal error, please contact us!");
            };

            RoomApiServer.readVariable(call, callback);
        });

        test("with error on reading", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "invalid",
                } satisfies VariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<VariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error).toEqual({
                    code: Status.NOT_FOUND,
                    message: "Variable not found",
                });
            };

            RoomApiServer.readVariable(call, callback);
        });

        it("should be read the variable", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<VariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(response).toEqual("Test Value");
            };

            RoomApiServer.readVariable(call, callback);
        });
    });

    describe("listenVariable", () => {
        test("with the authentication guard on error", () => {
            const metadata = new Metadata();
            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                destroy: (error: Error | undefined) => {
                    expect(error).toBeInstanceOf(GuardError);
                    if (error instanceof GuardError) {
                        expect(error.code).toEqual(Status.UNAUTHENTICATED);
                        expect(error.details).toEqual("X-API-Key metadata not defined!");
                    }
                },
                metadata,
            } as unknown as ServerWritableStreamImpl<VariableRequest, any>;

            RoomApiServer.listenVariable(call);
        });

        test("with the api client repository returning an error", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "invalid",
                    name: "test",
                } satisfies VariableRequest,
                destroy: (error: Error | undefined) => {
                    expect(error).toBeInstanceOf(Error);
                    if (error instanceof Error) {
                        expect(error.message).toEqual("Internal error, please contact us!");
                    }
                },
                metadata,
            } as unknown as ServerWritableStreamImpl<VariableRequest, any>;

            RoomApiServer.listenVariable(call);
        });

        test("with a random end event triggered on variable listener", async () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                destroy: (error: Error | undefined) => {},
                write: (data: any) => {},
                end: (data: any) => {
                    /*expect(error).toBeInstanceOf(Error);
                    if (error instanceof Error) {
                        expect(error.message).toEqual("Unexpected error");
                    }*/
                    readableCall.emit("end");
                },
                on: (event: string, callback: (data: any) => void) => {
                    readableCall.on(event, callback);
                },
                metadata,
            } as unknown as ServerWritableStreamImpl<VariableRequest, any>;

            await new Promise<void>((resolve) => {
                RoomApiServer.listenVariable(call);

                const interval = setInterval(() => {
                    readableResponse.emit("error", new Error("Unexpected error"));
                }, 200);

                readableCall.on("end", () => {
                    clearInterval(interval);
                    resolve();
                });
            });
        });

        test("with a canceled end event triggered on variable listener", async () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                destroy: (error: Error | undefined) => {},
                write: (data: any) => {},
                end: (error: Error | undefined) => {
                    expect(error).toEqual(undefined);
                    readableCall.emit("end");
                },
                on: (event: string, callback: (data: any) => void) => {
                    readableCall.on(event, callback);
                },
                metadata,
            } as unknown as ServerWritableStreamImpl<VariableRequest, any>;

            await new Promise<void>((resolve) => {
                RoomApiServer.listenVariable(call);

                const interval = setInterval(() => {
                    readableResponse.emit("error");
                }, 200);

                readableCall.on("end", () => {
                    clearInterval(interval);
                    resolve();
                });
            });
        });

        it("should be listen updates", async () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                } satisfies VariableRequest,
                destroy: (error: Error | undefined) => {},
                write: (data: any) => {
                    expect(data).toEqual("Test Value");
                    readableCall.emit("data");
                },
                end: (error: Error | undefined) => {
                    expect(error).toEqual(undefined);
                    readableCall.emit("end");
                },
                on: (event: string, callback: (data: any) => void) => {
                    readableCall.on(event, callback);
                },
                metadata,
            } as unknown as ServerWritableStreamImpl<VariableRequest, any>;

            const writeSpy = vi.spyOn(call, "write");
            let i = 0;

            await new Promise<void>((resolve) => {
                RoomApiServer.listenVariable(call);

                const interval = setInterval(() => {
                    readableResponse.emit("data", "Test Value");
                }, 200);

                readableCall.on("data", () => {
                    i++;

                    if (i === 2) {
                        expect(writeSpy).toHaveBeenCalledTimes(2);
                        clearInterval(interval);
                        resolve();
                    }
                });
            });
        });
    });

    describe("saveVariable", () => {
        test("with the authentication guard on error", () => {
            const metadata = new Metadata();
            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                    value: "test",
                } satisfies SaveVariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<SaveVariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error.code).toEqual(Status.UNAUTHENTICATED);
                expect(error.details).toEqual("X-API-Key metadata not defined!");
            };

            RoomApiServer.saveVariable(call, callback);
        });

        test("with the api client repository returning an error", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "invalid",
                    name: "test",
                    value: "test",
                } satisfies SaveVariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<SaveVariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error.code).toEqual(Status.INTERNAL);
                expect(error.details).toEqual("Internal error, please contact us!");
            };

            RoomApiServer.saveVariable(call, callback);
        });

        test("with error on reading", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "invalid",
                    value: "test",
                } satisfies SaveVariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<SaveVariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error).toEqual({
                    code: Status.NOT_FOUND,
                    message: "Variable not found",
                });
            };

            RoomApiServer.saveVariable(call, callback);
        });

        it("should be save the variable", () => {
            const metadata = new Metadata();
            metadata.set("X-API-Key", "MYAWESOMEKEY");

            const call = {
                request: {
                    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                    name: "test",
                    value: "test",
                } satisfies SaveVariableRequest,
                metadata,
            } as unknown as ServerUnaryCallImpl<SaveVariableRequest, any>;

            const callback = (error: any, response: any) => {
                expect(error).toEqual(null);
                expect(response).toEqual(null);
            };

            RoomApiServer.saveVariable(call, callback);
        });
    });
});

import { SpaceFilterMessage, RemoveSpaceUserMessage, SpaceUser } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import {
    Encoder,
    ProtobufSpaceEventEmitter,
    SpaceEventEmitterSocket,
    WebSocketStatus,
    SpaceFilterMessageCase,
} from "../SpaceEventEmitter/protobufSpaceEventEmitter";

describe("protobufSpaceEventEmitter", () => {
    describe("send", () => {
        it.each([WebSocketStatus.CLOSING, WebSocketStatus.CLOSED])(
            "should console.warn a message when socketReady State is %i ",
            (status) => {
                const socketMock: SpaceEventEmitterSocket = {
                    send: vi.fn(),
                    readyState: status,
                };

                const finishWatcher = vi.fn();
                const consoleSpy = vi.spyOn(console, "warn");
                const encoder: Encoder = {
                    encode: vi.fn().mockReturnValue({
                        finish: finishWatcher,
                    }),
                };

                const filterToSend: SpaceFilterMessage = {
                    filterName: "filter-name",
                    spaceName: "space-name",
                };

                const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

                protobufSpaceEventEmitter.addSpaceFilter(filterToSend);

                expect(consoleSpy).toHaveBeenCalledOnce();
                expect(consoleSpy).toHaveBeenCalledWith(
                    "Trying to send a message to the server, but the connection is closed. Message: ",
                    {
                        message: {
                            $case: SpaceFilterMessageCase.ADD,
                            addSpaceFilterMessage: filterToSend,
                        },
                    }
                );
            }
        );
    });
    describe("addSpaceFilter", () => {
        it("should send encode SpaceFilterMessage by the socket when you want to emit addSpaceFilter", () => {
            const socketMock: SpaceEventEmitterSocket = {
                send: vi.fn(),
                readyState: WebSocketStatus.OPEN,
            };

            const finishWatcher = vi.fn();

            const encoder: Encoder = {
                encode: vi.fn().mockReturnValue({
                    finish: finishWatcher,
                }),
            };

            const filterToSend: SpaceFilterMessage = {
                filterName: "filter-name",
                spaceName: "space-name",
            };

            const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

            protobufSpaceEventEmitter.addSpaceFilter(filterToSend);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(socketMock.send).toHaveBeenCalledOnce();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(encoder.encode).toHaveBeenCalledOnce();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(encoder.encode).toHaveBeenCalledWith({
                message: {
                    $case: "addSpaceFilterMessage",
                    addSpaceFilterMessage: filterToSend,
                },
            });
            expect(finishWatcher).toHaveBeenCalledOnce();
        });
    });
    it("should send encode SpaceFilterMessage by the socket when you want to emit removeSpaceFilter", () => {
        const socketMock: SpaceEventEmitterSocket = {
            send: vi.fn(),
            readyState: WebSocketStatus.OPEN,
        };

        const finishWatcher = vi.fn();

        const encoder: Encoder = {
            encode: vi.fn().mockReturnValue({
                finish: finishWatcher,
            }),
        };

        const filterToSend: SpaceFilterMessage = {
            filterName: "filter-name",
            spaceName: "space-name",
        };

        const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

        protobufSpaceEventEmitter.removeSpaceFilter(filterToSend);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(socketMock.send).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledWith({
            message: {
                $case: "removeSpaceFilterMessage",
                removeSpaceFilterMessage: filterToSend,
            },
        });
        expect(finishWatcher).toHaveBeenCalledOnce();
    });
    it("should send encode SpaceFilterMessage by the socket when you want to emit updateSpaceFilter", () => {
        const socketMock: SpaceEventEmitterSocket = {
            send: vi.fn(),
            readyState: WebSocketStatus.OPEN,
        };

        const finishWatcher = vi.fn();

        const encoder: Encoder = {
            encode: vi.fn().mockReturnValue({
                finish: finishWatcher,
            }),
        };

        const filterToSend: SpaceFilterMessage = {
            filterName: "filter-name",
            spaceName: "space-name",
        };

        const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

        protobufSpaceEventEmitter.updateSpaceFilter(filterToSend);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(socketMock.send).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledWith({
            message: {
                $case: "updateSpaceFilterMessage",
                updateSpaceFilterMessage: filterToSend,
            },
        });
        expect(finishWatcher).toHaveBeenCalledOnce();
    });
    it("should send encode SpaceFilterMessage by the socket when you want to emit updateSpaceMetaData", () => {
        const socketMock: SpaceEventEmitterSocket = {
            send: vi.fn(),
            readyState: WebSocketStatus.OPEN,
        };

        const finishWatcher = vi.fn();

        const encoder: Encoder = {
            encode: vi.fn().mockReturnValue({
                finish: finishWatcher,
            }),
        };

        const metadata = "metadata";
        const spaceName = "space-name";
        const filterName = undefined;

        const filterToSend: RemoveSpaceUserMessage = {
            filterName,
            spaceName,
            metadata,
        };

        const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

        protobufSpaceEventEmitter.updateSpaceMetadata(spaceName, metadata);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(socketMock.send).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledWith({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: filterToSend,
            },
        });
        expect(finishWatcher).toHaveBeenCalledOnce();
    });
    it("should send encode SpaceFilterMessage by the socket when you want to emit userJoinSpace", () => {
        const socketMock: SpaceEventEmitterSocket = {
            send: vi.fn(),
            readyState: WebSocketStatus.OPEN,
        };

        const finishWatcher = vi.fn();

        const encoder: Encoder = {
            encode: vi.fn().mockReturnValue({
                finish: finishWatcher,
            }),
        };

        const user: SpaceUser = {
            id: 0,
        };
        const spaceName = "space-name";

        const filterToSend: RemoveSpaceUserMessage = {
            filterName: undefined,
            spaceName,
            user,
        };

        const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

        protobufSpaceEventEmitter.userJoinSpace(spaceName, user);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(socketMock.send).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledWith({
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: filterToSend,
            },
        });
        expect(finishWatcher).toHaveBeenCalledOnce();
    });
    it("should send encode SpaceFilterMessage by the socket when you want to emit userLeaveSpace", () => {
        const socketMock: SpaceEventEmitterSocket = {
            send: vi.fn(),
            readyState: WebSocketStatus.OPEN,
        };

        const finishWatcher = vi.fn();

        const encoder: Encoder = {
            encode: vi.fn().mockReturnValue({
                finish: finishWatcher,
            }),
        };

        const user: SpaceUser = {
            id: 0,
        };
        const spaceName = "space-name";

        const filterToSend: RemoveSpaceUserMessage = {
            filterName: undefined,
            spaceName,
            userId: user.id,
        };

        const protobufSpaceEventEmitter = new ProtobufSpaceEventEmitter(socketMock, encoder);

        protobufSpaceEventEmitter.userLeaveSpace(spaceName, user);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(socketMock.send).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(encoder.encode).toHaveBeenCalledWith({
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: filterToSend,
            },
        });
        expect(finishWatcher).toHaveBeenCalledOnce();
    });
});

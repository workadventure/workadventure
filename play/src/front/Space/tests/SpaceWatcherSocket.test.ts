import { describe, vi, expect, it } from "vitest";
import { Subject } from "rxjs";
import {
    AddSpaceUserMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
    UpdateSpaceUserMessage,
} from "@workadventure/messages";
import { StreamSpaceWatcher } from "../SpaceWatcher/StreamSpaceWatcher";
import { SpaceStreams } from "../SpaceWatcher/SpaceStreamsInterface";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";

describe("StreamSpaceWatcher", () => {
    it("should subscribe to all stream when you create StreamSpaceWatcher", () => {
        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: {
                subscribe: vi.fn(),
            },
            removeSpaceUserMessage: {
                subscribe: vi.fn(),
            },
            updateSpaceMetadataMessage: {
                subscribe: vi.fn(),
            },
            updateSpaceUserMessage: {
                subscribe: vi.fn(),
            },
        };

        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
        };

        new StreamSpaceWatcher(SpaceProvider, spaceStream);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceStream.addSpaceUserMessage.subscribe).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceStream.removeSpaceUserMessage.subscribe).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceStream.updateSpaceMetadataMessage.subscribe).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(spaceStream.updateSpaceUserMessage.subscribe).toHaveBeenCalledOnce();
    });
    it("should call addUserToSpace when stream addSpaceUserMessage receive a new message", () => {
        const addSpaceUserMessage = new Subject<AddSpaceUserMessage>();
        const updateSpaceUserMessage = new Subject<UpdateSpaceUserMessage>();
        const removeSpaceUserMessage = new Subject<RemoveSpaceUserMessage>();
        const updateSpaceMetadataMessage = new Subject<UpdateSpaceMetadataMessage>();

        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: addSpaceUserMessage.asObservable(),
            updateSpaceUserMessage: updateSpaceUserMessage.asObservable(),
            removeSpaceUserMessage: removeSpaceUserMessage.asObservable(),
            updateSpaceMetadataMessage: updateSpaceMetadataMessage.asObservable(),
        };

        const addUserWatcher = vi.fn();
        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: () => {
                return {
                    getSpaceFilter: () => {
                        return {
                            addUser: addUserWatcher,
                        };
                    },
                };
            },
            getAll: vi.fn(),
        };

        const message: AddSpaceUserMessage = {
            spaceName: "space-name",
            user: {
                id: 1,
            },
        };

        new StreamSpaceWatcher(SpaceProvider, spaceStream);

        addSpaceUserMessage.next(message);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(addUserWatcher).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(addUserWatcher).toHaveBeenCalledWith(message.user);
    });
    it("should call removeUserToSpace when stream removeSpaceUserMessage receive a new message", () => {
        const addSpaceUserMessage = new Subject<AddSpaceUserMessage>();
        const updateSpaceUserMessage = new Subject<UpdateSpaceUserMessage>();
        const removeSpaceUserMessage = new Subject<RemoveSpaceUserMessage>();
        const updateSpaceMetadataMessage = new Subject<UpdateSpaceMetadataMessage>();

        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: addSpaceUserMessage.asObservable(),
            updateSpaceUserMessage: updateSpaceUserMessage.asObservable(),
            removeSpaceUserMessage: removeSpaceUserMessage.asObservable(),
            updateSpaceMetadataMessage: updateSpaceMetadataMessage.asObservable(),
        };

        const removeUserWatcher = vi.fn();
        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: () => {
                return {
                    getSpaceFilter: () => {
                        return {
                            removeUser: removeUserWatcher,
                        };
                    },
                };
            },
            getAll: vi.fn(),
        };

        const message: RemoveSpaceUserMessage = {
            userId: 1,
            spaceName: "space-name",
        };

        new StreamSpaceWatcher(SpaceProvider, spaceStream);
        removeSpaceUserMessage.next(message);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(removeUserWatcher).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(removeUserWatcher).toHaveBeenCalledWith(message.userId);
    });
    it("should call updateSpaceUserMessage when stream updateSpaceUserMessage receive a new message", () => {
        const addSpaceUserMessage = new Subject<AddSpaceUserMessage>();
        const updateSpaceUserMessage = new Subject<UpdateSpaceUserMessage>();
        const removeSpaceUserMessage = new Subject<RemoveSpaceUserMessage>();
        const updateSpaceMetadataMessage = new Subject<UpdateSpaceMetadataMessage>();

        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: addSpaceUserMessage.asObservable(),
            updateSpaceUserMessage: updateSpaceUserMessage.asObservable(),
            removeSpaceUserMessage: removeSpaceUserMessage.asObservable(),
            updateSpaceMetadataMessage: updateSpaceMetadataMessage.asObservable(),
        };

        const updateUserWatcher = vi.fn();
        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: () => {
                return {
                    getSpaceFilter: () => {
                        return {
                            updateUserData: updateUserWatcher,
                        };
                    },
                };
            },
            getAll: vi.fn(),
        };
        const message: UpdateSpaceUserMessage = {
            user: {
                id: 1,
            },
            spaceName: "",
        };

        new StreamSpaceWatcher(SpaceProvider, spaceStream);

        updateSpaceUserMessage.next(message);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(updateUserWatcher).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(updateUserWatcher).toHaveBeenCalledWith(message.user);
    });
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", () => {
        const addSpaceUserMessage = new Subject<AddSpaceUserMessage>();
        const updateSpaceUserMessage = new Subject<UpdateSpaceUserMessage>();
        const removeSpaceUserMessage = new Subject<RemoveSpaceUserMessage>();
        const updateSpaceMetadataMessage = new Subject<UpdateSpaceMetadataMessage>();

        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: addSpaceUserMessage.asObservable(),
            updateSpaceUserMessage: updateSpaceUserMessage.asObservable(),
            removeSpaceUserMessage: removeSpaceUserMessage.asObservable(),
            updateSpaceMetadataMessage: updateSpaceMetadataMessage.asObservable(),
        };

        const updateMetadataWatcher = vi.fn();

        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: () => {
                return {
                    setMetadata: updateMetadataWatcher,
                };
            },
            getAll: vi.fn(),
        };

        const message: UpdateSpaceMetadataMessage = {
            metadata: JSON.stringify({
                metadata: "metadata-value",
            }),
            spaceName: "space-name",
            filterName: undefined,
        };

        new StreamSpaceWatcher(SpaceProvider, spaceStream);

        updateSpaceMetadataMessage.next(message);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(updateMetadataWatcher).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/unbound-method

        const expectedParamMap = new Map([["metadata", "metadata-value"]]);
        expect(updateMetadataWatcher).toHaveBeenCalledWith(expectedParamMap);
    });
    it("should call unsubscribe of all subscription ", () => {
        const unsubscribeWatcher = vi.fn();

        const spaceStream: SpaceStreams = {
            addSpaceUserMessage: {
                subscribe: () => {
                    return {
                        unsubscribe: unsubscribeWatcher,
                    };
                },
            },
            updateSpaceUserMessage: {
                subscribe: () => {
                    return {
                        unsubscribe: unsubscribeWatcher,
                    };
                },
            },
            removeSpaceUserMessage: {
                subscribe: () => {
                    return {
                        unsubscribe: unsubscribeWatcher,
                    };
                },
            },
            updateSpaceMetadataMessage: {
                subscribe: () => {
                    return {
                        unsubscribe: unsubscribeWatcher,
                    };
                },
            },
        };

        const SpaceProvider: SpaceProviderInterface = {
            add: vi.fn(),
            delete: vi.fn(),
            exist: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
        };

        const streamSpaceWatcher = new StreamSpaceWatcher(SpaceProvider, spaceStream);
        streamSpaceWatcher.destroy();

        expect(unsubscribeWatcher).toBeCalledTimes(4);
    });
});

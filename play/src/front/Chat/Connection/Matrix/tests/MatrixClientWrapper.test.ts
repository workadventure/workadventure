import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ICreateClientOpts } from "matrix-js-sdk";
import type { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";
import type { MatrixClientWrapperInterface, MatrixLocalUserStore } from "../MatrixClientWrapper";
import { MatrixClientWrapper, MissingMatrixCredentialsError } from "../MatrixClientWrapper";
import { matrixSecurity } from "../MatrixSecurity";
import { modals } from "@wa-modals";

// @vitest-environment jsdom
vi.mock("../AccessSecretStorageDialog.svelte", () => {
    return { default: {} };
});

vi.mock("../CreateRecoveryKeyDialog.svelte", () => {
    return { default: {} };
});
vi.mock("../InteractiveAuthDialog.svelte", () => {
    return { default: {} };
});

vi.mock("../../../Stores/ChatStore.ts", () => {
    return {};
});

vi.mock("@wa-modals", () => {
    return {
        modals: {
            open: vi.fn(),
        },
    };
});

describe("MatrixClientWrapper", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        matrixSecurity.shouldDisplayModal = false;
    });
    describe("initMatrixClient", () => {
        const basicMockClient = {
            clearStores: vi.fn(),
            getUser: vi.fn().mockReturnValue({
                displayName: null,
            }),
            setDisplayName: vi.fn(),
        };

        const basicLocalUserStoreMock: MatrixLocalUserStore = {
            getLocalUser: vi.fn().mockReturnValue(null),
            getMatrixDeviceId: vi.fn().mockReturnValue(null),
            getMatrixAccessToken: vi.fn().mockReturnValue(null),
            getMatrixRefreshToken: vi.fn().mockReturnValue(null),
            getMatrixUserId: vi.fn().mockReturnValue(null),
            getMatrixStoresNeedClearing: vi.fn().mockReturnValue(false),
            setMatrixStoresNeedClearing: vi.fn(),
            getName: vi.fn().mockReturnValue(null),
        };

        it("should throw a error when localUserStore uuid is undefined or null", async () => {
            const createClient = vi.fn().mockReturnValue(basicMockClient);

            const matrixBaseURL = "baseUrl";

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                basicLocalUserStoreMock,
                createClient,
            );

            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow();
        });

        it("should throw a error when matrix access token is null", async () => {
            const createClient = vi.fn().mockReturnValue(basicMockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
            };

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, access token is null",
            );
            // A missing session must be typed so the UI can offer the "reconnect" prompt.
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toBeInstanceOf(
                MissingMatrixCredentialsError,
            );
        });
        it("should throw a error when matrixUserId is null", async () => {
            const createClient = vi.fn().mockReturnValue(basicMockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixAccessToken: vi.fn().mockReturnValue("accessToken"),
                getMatrixUserId: vi.fn().mockReturnValue(null),
            };

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            // matrixClientWrapperInstance.initMatrixClient()
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, matrixUserId is null",
            );
        });

        it("should throw a error when matrixDeviceId is null", async () => {
            const createClient = vi.fn().mockReturnValue(basicMockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixAccessToken: vi.fn().mockReturnValue("accessToken"),
                getMatrixUserId: vi.fn().mockReturnValue("matrixUserId"),
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
            };

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            // matrixClientWrapperInstance.initMatrixClient()
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, matrixDeviceId is null",
            );
        });

        it("should clear the stores left by the previous Matrix user, once", async () => {
            const spyClearStore = vi.fn();

            const mockClient = {
                ...basicMockClient,
                clearStores: spyClearStore,
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getMatrixUserId: vi.fn().mockReturnValue("userID"),
                getMatrixAccessToken: vi.fn().mockReturnValue("accessToken"),
                getMatrixStoresNeedClearing: vi.fn().mockReturnValue(true),
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "matrixIdFromLocalUser",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue("deviceID"),
            };

            // eslint-disable-next-line
            vi.spyOn(MatrixClientWrapper.prototype as any, "matrixWebClientStore").mockReturnValue({});

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            await matrixClientWrapperInstance.initMatrixClient();
            expect(spyClearStore).toHaveBeenCalledOnce();
            // eslint-disable-next-line
            expect(localUserStoreMock.setMatrixStoresNeedClearing).toHaveBeenCalledWith(false);
        });
        it("should create the client with the stored session", async () => {
            const userId = "Alice";
            const accessToken = "accessToken";
            const refreshToken = "refreshToken";
            const deviceId = "deviceId";
            const matrixBaseURL = "testUrl";

            const createClient = vi.fn().mockReturnValue(basicMockClient);

            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixAccessToken: vi.fn().mockReturnValue(accessToken),
                getMatrixRefreshToken: vi.fn().mockReturnValue(refreshToken),
                getMatrixUserId: vi.fn().mockReturnValue(userId),
                getMatrixDeviceId: vi.fn().mockReturnValue(deviceId),
            };
            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            await matrixClientWrapperInstance.initMatrixClient();

            expect(createClient).toHaveBeenCalledOnce();

            const createClientArg: ICreateClientOpts = createClient.mock.calls[0][0] as ICreateClientOpts;

            expect(createClientArg.baseUrl).toBe(matrixBaseURL);
            expect(createClientArg.deviceId).toBe(deviceId);
            expect(createClientArg.userId).toBe(userId);
            expect(createClientArg.accessToken).toBe(accessToken);
            expect(createClientArg.refreshToken).toBe(refreshToken);
            expect(createClientArg.cryptoCallbacks?.getSecretStorageKey).toBeDefined();
            expect(createClientArg.cryptoCallbacks?.cacheSecretStorageKey).toBeDefined();
        });

        it("should deduplicate concurrent secret storage key requests", async () => {
            matrixSecurity.shouldDisplayModal = true;

            const userId = "Alice";
            const accessToken = "accessToken";
            const refreshToken = "refreshToken";
            const deviceId = "deviceId";
            const matrixBaseURL = "testUrl";
            const secretStorageKeyId = "secretStorageKeyId";
            const secretStorageKey = new Uint8Array([1, 2, 3]);

            const mockClient = {
                ...basicMockClient,
                clearStores: vi.fn(),
                secretStorage: {
                    getDefaultKeyId: vi.fn().mockResolvedValue(secretStorageKeyId),
                },
            };

            const createClient = vi.fn().mockReturnValue(mockClient);
            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: true,
                    matrixUserId: userId,
                }),
                getMatrixAccessToken: vi.fn().mockReturnValue(accessToken),
                getMatrixRefreshToken: vi.fn().mockReturnValue(refreshToken),
                getMatrixUserId: vi.fn().mockReturnValue(userId),
                getMatrixDeviceId: vi.fn().mockReturnValue(deviceId),
            };

            // eslint-disable-next-line
            vi.spyOn(MatrixClientWrapper.prototype as any, "matrixWebClientStore").mockReturnValue({});

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient,
            );

            await matrixClientWrapperInstance.initMatrixClient();

            const lastCreateClientArg: ICreateClientOpts = createClient.mock.calls[0][0] as ICreateClientOpts;
            const getSecretStorageKey = lastCreateClientArg.cryptoCallbacks?.getSecretStorageKey;
            if (!getSecretStorageKey) {
                throw new Error("getSecretStorageKey callback is missing");
            }

            const keyRequest: { keys: Record<string, SecretStorageKeyDescriptionAesV1> } = {
                keys: {
                    [secretStorageKeyId]: {
                        algorithm: "m.secret_storage.v1.aes-hmac-sha2",
                        iv: "",
                        mac: "",
                        name: "",
                        passphrase: {
                            algorithm: "m.pbkdf2",
                            iterations: 1,
                            salt: "",
                        },
                    },
                },
            };

            const firstRequest = getSecretStorageKey(keyRequest, "m.cross_signing.master");
            const secondRequest = getSecretStorageKey(keyRequest, "m.cross_signing.master");

            await vi.waitFor(() => expect(modals.open).toHaveBeenCalledOnce());

            const openModalProps = vi.mocked(modals.open).mock.calls[0][1] as {
                onClose: (key: Uint8Array | null) => void;
            };
            openModalProps.onClose(secretStorageKey);

            await expect(firstRequest).resolves.toEqual([secretStorageKeyId, secretStorageKey]);
            await expect(secondRequest).resolves.toEqual([secretStorageKeyId, secretStorageKey]);
        });
    });
});

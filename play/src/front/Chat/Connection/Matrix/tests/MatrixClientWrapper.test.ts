import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ICreateClientOpts } from "matrix-js-sdk";
import { MatrixError } from "matrix-js-sdk";
import type { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";
import type { MatrixClientWrapperInterface, MatrixLocalUserStore } from "../MatrixClientWrapper";
import { InvalidLoginTokenError, MatrixClientWrapper, MissingMatrixCredentialsError } from "../MatrixClientWrapper";
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
        setMatrixDeviceId: vi.fn(),
        setMatrixUserId: vi.fn(),
        setMatrixAccessToken: vi.fn(),
        setMatrixRefreshToken: vi.fn(),
        setMatrixAccessTokenExpireDate: vi.fn(),
        getName: vi.fn().mockReturnValue(null),
    };

    describe("initMatrixClient", () => {
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

    describe("exchangeLoginToken", () => {
        /* eslint-disable @typescript-eslint/unbound-method */
        const loginResponse = {
            user_id: "@alice:example.org",
            access_token: "accessToken",
            refresh_token: "refreshToken",
            expires_in_ms: 60_000,
            device_id: "DEVICE",
        };

        it("should store the session the homeserver returns, and flag the stores of the previous user", async () => {
            const loginRequest = vi.fn().mockResolvedValue(loginResponse);
            const createClient = vi.fn().mockReturnValue({ loginRequest });
            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getMatrixUserId: vi.fn().mockReturnValue("@previous:example.org"),
            };

            await new MatrixClientWrapper("testUrl", localUserStoreMock, createClient).exchangeLoginToken("LoginToken");

            expect(loginRequest).toHaveBeenCalledWith({
                type: "m.login.token",
                token: "LoginToken",
                initial_device_display_name: "WorkAdventure",
            });
            expect(localUserStoreMock.setMatrixUserId).toHaveBeenCalledWith("@alice:example.org");
            expect(localUserStoreMock.setMatrixAccessToken).toHaveBeenCalledWith("accessToken");
            expect(localUserStoreMock.setMatrixRefreshToken).toHaveBeenCalledWith("refreshToken");
            expect(localUserStoreMock.setMatrixDeviceId).toHaveBeenCalledWith("DEVICE", "@alice:example.org");
            expect(localUserStoreMock.setMatrixAccessTokenExpireDate).toHaveBeenCalledOnce();
            // Another Matrix user used this browser before: the chat must clear the stores before it connects.
            expect(localUserStoreMock.setMatrixStoresNeedClearing).toHaveBeenCalledWith(true);
        });

        it("should keep the stores when the same Matrix user logs in again", async () => {
            const createClient = vi.fn().mockReturnValue({ loginRequest: vi.fn().mockResolvedValue(loginResponse) });
            const localUserStoreMock: MatrixLocalUserStore = {
                ...basicLocalUserStoreMock,
                getMatrixUserId: vi.fn().mockReturnValue("@alice:example.org"),
            };

            await new MatrixClientWrapper("testUrl", localUserStoreMock, createClient).exchangeLoginToken("LoginToken");

            expect(localUserStoreMock.setMatrixStoresNeedClearing).not.toHaveBeenCalled();
        });

        it("should give up at once when the homeserver refuses the token", async () => {
            const loginRequest = vi
                .fn()
                .mockRejectedValue(new MatrixError({ errcode: "M_FORBIDDEN", error: "Invalid login token" }, 403));
            const createClient = vi.fn().mockReturnValue({ loginRequest });

            await expect(
                new MatrixClientWrapper("testUrl", basicLocalUserStoreMock, createClient).exchangeLoginToken(
                    "LoginToken",
                    [0, 0],
                ),
            ).rejects.toBeInstanceOf(InvalidLoginTokenError);

            expect(loginRequest).toHaveBeenCalledOnce();
            expect(basicLocalUserStoreMock.setMatrixAccessToken).not.toHaveBeenCalled();
        });

        it("should retry when the homeserver does not answer", async () => {
            const loginRequest = vi
                .fn()
                .mockRejectedValueOnce(new TypeError("Failed to fetch"))
                .mockResolvedValueOnce(loginResponse);
            const createClient = vi.fn().mockReturnValue({ loginRequest });

            await new MatrixClientWrapper("testUrl", basicLocalUserStoreMock, createClient).exchangeLoginToken(
                "LoginToken",
                [0, 0],
            );

            expect(loginRequest).toHaveBeenCalledTimes(2);
            expect(basicLocalUserStoreMock.setMatrixAccessToken).toHaveBeenCalledWith("accessToken");
        });

        it("should fail with the last error once the retries are spent", async () => {
            const loginRequest = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
            const createClient = vi.fn().mockReturnValue({ loginRequest });

            await expect(
                new MatrixClientWrapper("testUrl", basicLocalUserStoreMock, createClient).exchangeLoginToken(
                    "LoginToken",
                    [0, 0],
                ),
            ).rejects.toThrow("Failed to fetch");

            expect(loginRequest).toHaveBeenCalledTimes(3);
        });
    });
});

import { describe, expect, it, vi } from "vitest";
import { MatrixClientWrapperInterface, MatrixLocalUserStore, MatrixClientWrapper } from "../MatrixClientWrapper";

// @vitest-environment jsdom
vi.mock("../AccessSecretStorageDialog.svelte", () => {
    return {};
});

vi.mock("../CreateRecoveryKeyDialog.svelte", () => {
    return {};
});
vi.mock("../InteractiveAuthDialog.svelte", () => {
    return {};
});

describe("MatrixClientWrapper", () => {
    describe("initMatrixClient", () => {
        it("should throw a error when localUserStore uuid is undefined or null", async () => {
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: null,
                        refresh_token: null,
                        user_id: null,
                    });
                },
                setGuest: () => {},
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: () => {
                    return null;
                },
            } as MatrixLocalUserStore;

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );

            // eslint-disable-next-line
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow();
        });
        it("should throw a error when registerGuest throw a error", async () => {
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: null,
                        refresh_token: null,
                        user_id: null,
                    });
                },
                setGuest: () => {},
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken: vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: function (userId: string): void {
                    throw new Error("setMatrixUserId not implemented.");
                },
                setMatrixAccessToken: function (accessToken: string): void {
                    throw new Error("setMatrixAccessToken not implemented.");
                },
                setMatrixRefreshToken: function (refreshToken: string | null): void {
                    throw new Error("setMatrixRefreshToken not implemented.");
                },
                setMatrixAccessTokenExpireDate: function (AccessTokenExpireDate: Date): void {
                    throw new Error("setMatrixAccessTokenExpireDate not implemented.");
                },
                getName: function (): string {
                    throw new Error("getName not implemented.");
                },
            } as unknown as MatrixLocalUserStore;

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );
            // eslint-disable-next-line
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to establish a Matrix Guest connection"
            );
        });
        it("should throw a error when matrix access token is null", async () => {
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: null,
                        refresh_token: null,
                        user_id: null,
                        device_id: null,
                        matrixUserId: null,
                    });
                },
                setGuest: () => {},
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken: vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName: vi.fn().mockReturnValue("Alice"),
                setGuest: vi.fn(),
                isGuest: vi.fn(),
            } as unknown as MatrixLocalUserStore;

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );

            // matrixClientWrapperInstance.initMatrixClient()
            // eslint-disable-next-line
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, access token is null"
            );
        });
        it("should throw a error when matrixUserId is null", async () => {
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: null,
                        refresh_token: null,
                        user_id: null,
                    });
                },
                setGuest: () => {},
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue("accessToken"),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken: vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName: vi.fn().mockReturnValue(""),
                setGuest: vi.fn(),
                isGuest: vi.fn(),
            } as unknown as MatrixLocalUserStore;
            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );

            // matrixClientWrapperInstance.initMatrixClient()
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, matrixUserId is null"
            );
        });

        it("should throw a error when matrixDeviceId is null", async () => {
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: null,
                        refresh_token: null,
                        user_id: null,
                    });
                },
                setGuest: () => {},
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue("accessToken"),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue("matrixUserId"),
                getMatrixLoginToken: vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName: vi.fn().mockReturnValue(""),
                setGuest: vi.fn(),
                isGuest: vi.fn(),
            } as unknown as MatrixLocalUserStore;
            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );

            // matrixClientWrapperInstance.initMatrixClient()
            await expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow(
                "Unable to connect to matrix, matrixDeviceId is null"
            );
        });

        it("should Call clearStore when oldMatrixId !== newMatrixI", async () => {
            //oldFromLocalStorage
            //newFrom login token or guestAccess
            const spyClearStore = vi.fn();
            const mockClient = {
                login: () => {
                    return Promise.resolve({
                        user_id: "matrixIdFromLogin",
                        access_token: null,
                        refresh_token: null,
                        expires_in_ms: "",
                    });
                },
                registerGuest: () => {
                    return Promise.resolve({
                        access_token: "accessToken",
                        refresh_token: null,
                        user_id: "matrixIdFromRegisterGuest",
                        device_id: "deviceID-guest",
                    });
                },
                setGuest: () => {},
                clearStores: spyClearStore,
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock: MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "matrixIdFromLocalUser",
                }),
                getMatrixDeviceId: vi.fn().mockReturnValue("deviceID"),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken: vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName: vi.fn().mockReturnValue(""),
                setGuest: vi.fn(),
                isGuest: vi.fn(),
            } as unknown as MatrixLocalUserStore;

            // eslint-disable-next-line
            vi.spyOn(MatrixClientWrapper.prototype as any, "matrixWebClientStore").mockReturnValue({});

            const matrixClientWrapperInstance: MatrixClientWrapperInterface = new MatrixClientWrapper(
                matrixBaseURL,
                localUserStoreMock,
                createClient
            );

            await matrixClientWrapperInstance.initMatrixClient();
            expect(spyClearStore).toHaveBeenCalledOnce();
        });

        it.skip("should call final create client with user Information when user have a matrix account", () => {
            expect(true).toBe(false);
        });

        it.skip("should call final create client with new guest account Information when user have not a matrix account", () => {
            expect(true).toBe(false);
        });
    });
});

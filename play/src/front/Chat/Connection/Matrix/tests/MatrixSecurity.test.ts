import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatrixClient } from "matrix-js-sdk";
import { writable } from "svelte/store";
import { MatrixSecurity } from "../MatrixSecurity";

vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock("../AccessSecretStorageDialog.svelte", () => {
    return {};
});

vi.mock("../CreateRecoveryKeyDialog.svelte", () => {
    return {};
});
vi.mock("../InteractiveAuthDialog.svelte", () => {
    return {};
});

vi.mock("../../../Stores/ChatStore.ts", () => {
    return {
        alreadyAskForInitCryptoConfiguration: writable(false),
    };
});
describe("MatrixSecurity", () => {
    describe("initClientCryptoConfiguration", () => {
        const basicMockClient = {
            isGuest: vi.fn().mockReturnValue(null),
            getCrypto: vi.fn().mockReturnValue(null),
            getKeyBackupVersion: vi.fn().mockReturnValue(null),
        };

        const basicMockCrypto = {
            isCrossSigningReady: vi.fn().mockReturnValue(null),
            bootstrapCrossSigning: vi.fn().mockResolvedValue(null),
            bootstrapSecretStorage: vi.fn().mockResolvedValue(null),
        };

        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it("should reject promise when matrixClient is null", async () => {
            const matrixSecurity = new MatrixSecurity();
            await expect(matrixSecurity.initClientCryptoConfiguration()).rejects.toThrow("matrixClientStore is null");
        });
        it("should reject promise when current user is a guest", async () => {
            const matrixSecurity = new MatrixSecurity();

            const mockMatrixClient = {
                ...basicMockClient,
                isGuest: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await expect(matrixSecurity.initClientCryptoConfiguration()).rejects.toThrow(
                "Guest user, no encryption key"
            );
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.isGuest).toHaveBeenCalledOnce();
        });
        it("should reject promise when crypto is not available in matrixClient", async () => {
            const matrixSecurity = new MatrixSecurity();

            const mockMatrixClient = {
                ...basicMockClient,
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: vi.fn().mockReturnValue(undefined),
            } as unknown as MatrixClient;

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await expect(matrixSecurity.initClientCryptoConfiguration()).rejects.toThrow(
                "E2EE is not available for this client"
            );
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getCrypto).toHaveBeenCalledOnce();
        });
        it("should return void when Encryption is already initialized", async () => {
            const matrixSecurity = new MatrixSecurity(Promise.resolve());

            const mockMatrixClient = {
                ...basicMockClient,
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: vi.fn().mockReturnValue(basicMockCrypto),
            } as unknown as MatrixClient;

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            const consoleInfoSpy = vi.spyOn(console, "info");
            await expect(matrixSecurity.initClientCryptoConfiguration()).resolves.toEqual(undefined);
            expect(consoleInfoSpy).toHaveBeenCalled();
        });
        it("should call bootstrap / restore backup message function when crossSigning is not ready or keybackupinfo is not null ", async () => {
            const mockCrypto = {
                isCrossSigningReady: vi.fn().mockReturnValue(false),
                bootstrapCrossSigning: vi.fn().mockResolvedValue({}),
                bootstrapSecretStorage: vi.fn().mockResolvedValue({}),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
                getKeyBackupVersion: vi.fn().mockResolvedValue("keyBackUpInfo"),
            } as unknown as MatrixClient;

            const matrixSecurity = new MatrixSecurity(undefined);

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            matrixSecurity["restoreBackupMessages"] = vi.fn();

            await matrixSecurity.initClientCryptoConfiguration();

            await matrixSecurity["initializingEncryptionPromise"];

            expect(mockCrypto.bootstrapCrossSigning).toHaveBeenCalledOnce();
            expect(mockCrypto.bootstrapSecretStorage).toHaveBeenCalledOnce();

            expect(matrixSecurity["restoreBackupMessages"]).toHaveBeenCalledOnce();
        });
        it("should call bootstrap and should not restore backup message function when crossSigning is not ready and keybackupinfo is null ", async () => {
            const mockCrypto = {
                isCrossSigningReady: vi.fn().mockReturnValue(true),
                bootstrapCrossSigning: vi.fn().mockResolvedValue({}),
                bootstrapSecretStorage: vi.fn().mockResolvedValue({}),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
                getKeyBackupVersion: vi.fn().mockResolvedValue(null),
            } as unknown as MatrixClient;

            const matrixSecurity = new MatrixSecurity(undefined);

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            matrixSecurity["restoreBackupMessages"] = vi.fn();

            await matrixSecurity.initClientCryptoConfiguration();

            await matrixSecurity["initializingEncryptionPromise"];

            expect(mockCrypto.bootstrapCrossSigning).toHaveBeenCalledOnce();
            expect(mockCrypto.bootstrapSecretStorage).toHaveBeenCalledOnce();

            expect(matrixSecurity["restoreBackupMessages"]).not.toHaveBeenCalledOnce();
        });
        it("should not call bootstrap and should not restore backup message function when crossSigning is not ready and keybackupinfo is null ", async () => {
            const mockCrypto = {
                isCrossSigningReady: vi.fn().mockReturnValue(true),
                bootstrapCrossSigning: vi.fn().mockResolvedValue({}),
                bootstrapSecretStorage: vi.fn().mockResolvedValue({}),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
                getKeyBackupVersion: vi.fn().mockResolvedValue("keyBackUpInfo"),
            } as unknown as MatrixClient;

            const matrixSecurity = new MatrixSecurity(undefined);

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            matrixSecurity["restoreBackupMessages"] = vi.fn();

            await matrixSecurity.initClientCryptoConfiguration();

            await matrixSecurity["initializingEncryptionPromise"];

            expect(mockCrypto.bootstrapCrossSigning).not.toHaveBeenCalledOnce();
            expect(mockCrypto.bootstrapSecretStorage).not.toHaveBeenCalledOnce();

            expect(matrixSecurity["restoreBackupMessages"]).toHaveBeenCalledOnce();
        });
        it("should set initializingEncryptionPromise to undefined when we catch a error during the initialization", async () => {
            const mockCrypto = {
                isCrossSigningReady: vi.fn().mockReturnValue(false),
                bootstrapCrossSigning: vi.fn().mockRejectedValue(""),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
                getKeyBackupVersion: vi.fn().mockResolvedValue("keyBackUpInfo"),
            } as unknown as MatrixClient;

            const matrixSecurity = new MatrixSecurity(undefined);

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            matrixSecurity["restoreBackupMessages"] = vi.fn();

            await matrixSecurity.initClientCryptoConfiguration();

            await matrixSecurity["initializingEncryptionPromise"]?.catch(() =>
                expect(matrixSecurity["initializingEncryptionPromise"]).toBeUndefined()
            );
        });
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatrixClient, SecretStorage } from "matrix-js-sdk";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";
import { VerificationRequestEvent, VerifierEvent } from "matrix-js-sdk/lib/crypto-api";
import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
import { writable } from "svelte/store";
import { MatrixSecurity } from "../MatrixSecurity";

vi.mock("matrix-js-sdk/lib/crypto/key_passphrase", () => {
    return {
        deriveKey: vi.fn(),
    };
});

vi.mock("matrix-js-sdk/lib/crypto/recoverykey", () => {
    return {
        decodeRecoveryKey: vi.fn(),
    };
});

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
    describe("makeInputToKey", () => {
        beforeEach(() => {
            vi.mocked(deriveKey).mockReset();
            vi.mocked(decodeRecoveryKey).mockReset();
        });

        it("should decode a recovery key even when no passphrase metadata is configured", async () => {
            const expectedKey = new Uint8Array([1, 2, 3]);
            vi.mocked(decodeRecoveryKey).mockReturnValue(expectedKey);
            const keyInfo = {} as SecretStorage.SecretStorageKeyDescription;

            await expect(MatrixSecurity.makeInputToKey(keyInfo)({ recoveryKey: "recovery-key" })).resolves.toBe(
                expectedKey
            );

            expect(decodeRecoveryKey).toHaveBeenCalledWith("recovery-key");
            expect(deriveKey).not.toHaveBeenCalled();
        });

        it("should reject passphrase input when no passphrase metadata is configured", async () => {
            const keyInfo = {} as SecretStorage.SecretStorageKeyDescription;

            await expect(MatrixSecurity.makeInputToKey(keyInfo)({ passphrase: "security-passphrase" })).rejects.toThrow(
                "This secret storage key cannot be unlocked with a passphrase"
            );

            expect(deriveKey).not.toHaveBeenCalled();
            expect(decodeRecoveryKey).not.toHaveBeenCalled();
        });

        it("should derive a key from passphrase metadata when passphrase is configured", async () => {
            const expectedKey = new Uint8Array([4, 5, 6]);
            vi.mocked(deriveKey).mockResolvedValue(expectedKey);
            const keyInfo = {
                passphrase: {
                    salt: "storage-salt",
                    iterations: 500000,
                },
            } as SecretStorage.SecretStorageKeyDescription;

            await expect(MatrixSecurity.makeInputToKey(keyInfo)({ passphrase: "security-passphrase" })).resolves.toBe(
                expectedKey
            );

            expect(deriveKey).toHaveBeenCalledWith("security-passphrase", "storage-salt", 500000);
            expect(decodeRecoveryKey).not.toHaveBeenCalled();
        });
    });

    describe("verifyOwnDevice", () => {
        it("should start SAS verification once and use the SDK mismatch callback", async () => {
            const showSasCallbacks = {
                sas: {
                    emoji: [["🌙", "Moon"]],
                },
                confirm: vi.fn(),
                mismatch: vi.fn(),
                cancel: vi.fn(),
            };
            const verifier = {
                on: vi.fn((event, callback: (callbacks: typeof showSasCallbacks) => void) => {
                    if (event === VerifierEvent.ShowSas) {
                        callback(showSasCallbacks);
                    }
                }),
                verify: vi.fn(() => new Promise<void>(() => {})),
            };
            let changeCallback: (() => void) | undefined;
            const verificationRequest = {
                phase: Phase.Ready,
                initiatedByMe: true,
                startVerification: vi.fn().mockResolvedValue(verifier),
                on: vi.fn((event, callback: () => void) => {
                    if (event === VerificationRequestEvent.Change) {
                        changeCallback = callback;
                    }
                }),
            };
            const crypto = {
                requestOwnUserVerification: vi.fn().mockResolvedValue(verificationRequest),
            };
            const matrixClient = {
                getCrypto: vi.fn().mockReturnValue(crypto),
            } as unknown as MatrixClient;
            const openModal = vi.fn();
            const matrixSecurity = new MatrixSecurity(undefined, undefined, openModal);
            matrixSecurity.updateMatrixClientStore(matrixClient);

            await matrixSecurity.verifyOwnDevice();
            await Promise.resolve();
            changeCallback?.();
            changeCallback?.();
            const pendingModalProps = vi.mocked(openModal).mock.calls[0][1];
            const verificationEmojiProps = await pendingModalProps.startVerificationPromise;

            await verificationEmojiProps.mismatchCallback();

            expect(verificationRequest.startVerification).toHaveBeenCalledOnce();
            expect(verifier.verify).toHaveBeenCalledOnce();
            expect(showSasCallbacks.mismatch).toHaveBeenCalledOnce();
        });
    });

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

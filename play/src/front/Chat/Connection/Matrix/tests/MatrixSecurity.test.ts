import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatrixClient } from "matrix-js-sdk";
import { VerificationPhase, VerificationRequestEvent } from "matrix-js-sdk/lib/crypto-api";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
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

const createClientWithVerifiedOtherDevice = () => {
    const otherDevice = {
        deviceId: "OTHER",
        getIdentityKey: vi.fn(() => "identity-key"),
    };
    const crypto = {
        getUserDeviceInfo: vi
            .fn()
            .mockResolvedValue(new Map([["@me:example.test", new Map([["OTHER", otherDevice]])]])),
        getDeviceVerificationStatus: vi.fn((_userId: string, deviceId: string) => {
            return Promise.resolve({ signedByOwner: deviceId === "OTHER" });
        }),
    };
    const mockMatrixClient = {
        getCrypto: vi.fn(() => crypto),
        getUserId: vi.fn(() => "@me:example.test"),
        getDeviceId: vi.fn(() => "CURRENT"),
        getKeyBackupVersion: vi.fn().mockResolvedValue(null),
        isGuest: vi.fn(() => false),
    } as unknown as MatrixClient;

    return { mockMatrixClient, crypto };
};

describe("MatrixSecurity", () => {
    describe("openAutomaticChooseDeviceVerificationMethodModal", () => {
        it("opens the device verification chooser once for concurrent automatic requests", async () => {
            const openModal = vi.fn();
            const { mockMatrixClient } = createClientWithVerifiedOtherDevice();

            const matrixSecurity = new MatrixSecurity(undefined, undefined, openModal);
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await Promise.all([
                matrixSecurity.openAutomaticChooseDeviceVerificationMethodModal(),
                matrixSecurity.openAutomaticChooseDeviceVerificationMethodModal(),
            ]);

            expect(openModal).toHaveBeenCalledOnce();
        });

        it("does not reopen the device verification chooser automatically after the first attempt", async () => {
            const openModal = vi.fn();
            const { mockMatrixClient } = createClientWithVerifiedOtherDevice();

            const matrixSecurity = new MatrixSecurity(undefined, undefined, openModal);
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await matrixSecurity.openAutomaticChooseDeviceVerificationMethodModal();
            await matrixSecurity.openAutomaticChooseDeviceVerificationMethodModal();

            expect(openModal).toHaveBeenCalledOnce();
        });
    });

    describe("openChooseDeviceVerificationMethodModal", () => {
        it("can reopen the device verification chooser explicitly after an automatic attempt", async () => {
            const openModal = vi.fn();
            const { mockMatrixClient } = createClientWithVerifiedOtherDevice();

            const matrixSecurity = new MatrixSecurity(undefined, undefined, openModal);
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await matrixSecurity.openAutomaticChooseDeviceVerificationMethodModal();
            await matrixSecurity.openChooseDeviceVerificationMethodModal();

            expect(openModal).toHaveBeenCalledTimes(2);
        });
    });

    describe("verifyOwnDevice", () => {
        // The start sequence (getUserDeviceInfo -> startVerification) runs asynchronously, so let its
        // microtasks settle before asserting (one macrotask tick drains the pending microtask queue).
        const flush = () =>
            new Promise((resolve) => {
                setTimeout(resolve, 0);
            });

        // Minimal stand-in for a matrix-js-sdk VerificationRequest: an event emitter with a mutable phase
        // and a startVerification() spy, so we can drive the phase transitions the SDK would emit.
        const createFakeVerificationRequest = (otherPartySupportsSas = true) => {
            const request = Object.assign(new EventEmitter(), {
                phase: VerificationPhase.Requested,
                initiatedByMe: true,
                chosenMethod: null as string | null,
                verifier: undefined,
                otherPartySupportsMethod: vi.fn((method: string) =>
                    method === VerificationMethod.Sas ? otherPartySupportsSas : false,
                ),
                startVerification: vi.fn().mockResolvedValue({
                    getShowSasCallbacks: vi.fn(() => null),
                    on: vi.fn(),
                    off: vi.fn(),
                    verify: vi.fn(() => new Promise(() => {})),
                }),
            });
            return request;
        };

        const createInitiatingClient = (request: EventEmitter) => {
            const crypto = {
                requestOwnUserVerification: vi.fn().mockResolvedValue(request),
                getUserDeviceInfo: vi.fn().mockResolvedValue(new Map()),
            };
            const mockMatrixClient = {
                getCrypto: vi.fn(() => crypto),
                getUserId: vi.fn(() => "@me:example.test"),
            } as unknown as MatrixClient;
            return { mockMatrixClient, crypto };
        };

        it("downloads the other device's keys, then sends the start once the peer is Ready", async () => {
            const request = createFakeVerificationRequest();
            const { mockMatrixClient, crypto } = createInitiatingClient(request);

            const matrixSecurity = new MatrixSecurity(undefined, undefined, vi.fn());
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await matrixSecurity.verifyOwnDevice();

            // Still only Requested: nothing to start yet.
            expect(request.startVerification).not.toHaveBeenCalled();

            // The other device accepts -> Ready. As the initiator we must drive the start ourselves,
            // otherwise the flow stalls here forever (the bug this guards against).
            request.phase = VerificationPhase.Ready;
            request.emit(VerificationRequestEvent.Change);
            await flush();

            // Force-download our own devices first so startVerification() cannot reject with
            // "other device is unknown" on a fresh session.
            expect(crypto.getUserDeviceInfo).toHaveBeenCalledWith(["@me:example.test"], true);
            expect(request.startVerification).toHaveBeenCalledTimes(1);
            expect(request.startVerification).toHaveBeenCalledWith(VerificationMethod.Sas);
        });

        it("starts SAS only once even if the Ready phase is observed repeatedly", async () => {
            const request = createFakeVerificationRequest();
            const { mockMatrixClient } = createInitiatingClient(request);

            const matrixSecurity = new MatrixSecurity(undefined, undefined, vi.fn());
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await matrixSecurity.verifyOwnDevice();

            request.phase = VerificationPhase.Ready;
            request.emit(VerificationRequestEvent.Change);
            request.emit(VerificationRequestEvent.Change);
            await flush();

            expect(request.startVerification).toHaveBeenCalledTimes(1);
        });

        it("does not start SAS when the other party does not support it", async () => {
            const request = createFakeVerificationRequest(false);
            const { mockMatrixClient } = createInitiatingClient(request);

            const matrixSecurity = new MatrixSecurity(undefined, undefined, vi.fn());
            matrixSecurity.updateMatrixClientStore(mockMatrixClient);

            await matrixSecurity.verifyOwnDevice();

            request.phase = VerificationPhase.Ready;
            request.emit(VerificationRequestEvent.Change);
            await flush();

            expect(request.startVerification).not.toHaveBeenCalled();
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
                "Guest user, no encryption key",
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
                "E2EE is not available for this client",
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
                getKeyBackupInfo: vi.fn().mockResolvedValue("keyBackUpInfo"),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
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
                getKeyBackupInfo: vi.fn().mockResolvedValue(null),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
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
                getKeyBackupInfo: vi.fn().mockResolvedValue("keyBackUpInfo"),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
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
                getKeyBackupInfo: vi.fn().mockResolvedValue("keyBackUpInfo"),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(false),
                getCrypto: () => mockCrypto,
            } as unknown as MatrixClient;

            const matrixSecurity = new MatrixSecurity(undefined);

            matrixSecurity.updateMatrixClientStore(mockMatrixClient);
            matrixSecurity["restoreBackupMessages"] = vi.fn();

            await matrixSecurity.initClientCryptoConfiguration();

            await matrixSecurity["initializingEncryptionPromise"]?.catch(() =>
                expect(matrixSecurity["initializingEncryptionPromise"]).toBeUndefined(),
            );
        });
    });
});

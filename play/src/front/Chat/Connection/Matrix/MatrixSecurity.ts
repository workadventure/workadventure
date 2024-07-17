import { MatrixClient, SecretStorage } from "matrix-js-sdk";
import { GeneratedSecretStorageKey, KeyBackupInfo } from "matrix-js-sdk/lib/crypto-api";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";
import { openModal } from "svelte-modals";
import { writable } from "svelte/store";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";

export type KeyParams = { passphrase?: string; recoveryKey?: string };

export class MatrixSecurity {
    isEncryptionRequiredAndNotSet = writable(false);
    private matrixClientStore: MatrixClient | null = null;

    constructor(
        private initializingEncryptionPromise: Promise<void> | undefined = undefined,
        private _openModal = openModal
    ) {}

    initClientCryptoConfiguration = async (): Promise<void> => {
        if (!this.matrixClientStore) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }

        if (this.matrixClientStore.isGuest()) {
            return Promise.reject(new Error("Guest user, no encryption key"));
        }

        const crypto = this.matrixClientStore.getCrypto();

        if (crypto === undefined) {
            return Promise.reject(new Error("E2EE is not available for this client"));
        }
        if (this.initializingEncryptionPromise) {
            console.info("Encryption already initialized");
            return;
        }

        this.initializingEncryptionPromise = new Promise<void>((resolve, initializingEncryptionReject) => {
            (async () => {
                const keyBackupInfo = await this.matrixClientStore?.getKeyBackupVersion();
                const isCrossSigningReady = await crypto.isCrossSigningReady();

                if (!isCrossSigningReady || keyBackupInfo === null) {
                    await crypto.bootstrapCrossSigning({
                        authUploadDeviceSigningKeys: async (makeRequest) => {
                            const finished = await new Promise<boolean>((resolve) => {
                                this._openModal(InteractiveAuthDialog, {
                                    matrixClient: this.matrixClientStore,
                                    onFinished: (finished: boolean) => resolve(finished),
                                    makeRequest,
                                });
                            });
                            if (!finished) {
                                this.isEncryptionRequiredAndNotSet.set(true);
                                return initializingEncryptionReject(
                                    new Error("Cross-signing key upload auth canceled")
                                );
                            }
                        },
                        setupNewCrossSigning: keyBackupInfo === null,
                    });

                    await crypto.bootstrapSecretStorage({
                        createSecretStorageKey: async () => {
                            const generatedKey = await new Promise<GeneratedSecretStorageKey | null>(
                                (resolve, reject) => {
                                    this._openModal(CreateRecoveryKeyDialog, {
                                        crypto,
                                        processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
                                            if (generatedKey === undefined) {
                                                return reject(new Error("no generated secret storage key"));
                                            }
                                            resolve(generatedKey);
                                        },
                                    });
                                }
                            );

                            if (generatedKey === null) {
                                this.isEncryptionRequiredAndNotSet.set(true);
                                const createSecretStorageKeyError = new Error(
                                    "createSecretStorageKey : no generated secret storage key"
                                );
                                initializingEncryptionReject(createSecretStorageKeyError);
                                return Promise.reject(createSecretStorageKeyError);
                            }
                            return Promise.resolve(generatedKey);
                        },
                        setupNewKeyBackup: keyBackupInfo === null,
                        keyBackupInfo: keyBackupInfo ?? undefined,
                    });

                    this.isEncryptionRequiredAndNotSet.set(false);
                }

                if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                    await this.restoreBackupMessages(keyBackupInfo);
                }

                return resolve();
            })
                .bind(this)()
                .catch((error) => {
                    console.error("initClientCryptoConfiguration error: ", error);
                    this.initializingEncryptionPromise = undefined;
                    initializingEncryptionReject(error);
                    return;
                });
        });

        return;
    };

    updateMatrixClientStore(matrixClient: MatrixClient) {
        this.matrixClientStore = matrixClient;
    }

    static makeInputToKey(
        keyInfo: SecretStorage.SecretStorageKeyDescription
    ): (keyParams: KeyParams) => Promise<Uint8Array> {
        return async ({ passphrase, recoveryKey }): Promise<Uint8Array> => {
            if (passphrase) {
                return deriveKey(passphrase, keyInfo.passphrase.salt, keyInfo.passphrase.iterations);
            } else if (recoveryKey) {
                return decodeRecoveryKey(recoveryKey);
            }
            throw new Error("Invalid input, passphrase or recoveryKey need to be provided");
        };
    }

    private async restoreBackupMessages(keyBackupInfo: KeyBackupInfo) {
        try {
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            const has4s = await this.matrixClientStore.secretStorage.hasKey();
            const backupRestored = has4s ? await this.matrixClientStore.isKeyBackupKeyStored() : null;

            const restoredWithCachedKey = await this.restoreWithCachedKey(keyBackupInfo);
            if (!restoredWithCachedKey && backupRestored) {
                await this.restoreWithSecretStorage(keyBackupInfo);
            }
        } catch (error) {
            console.error("Unable to restoreBackupMessages : ", error);
        }
        return;
    }

    private async restoreWithCachedKey(keyBackupInfo: KeyBackupInfo) {
        try {
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            await this.matrixClientStore.restoreKeyBackupWithCache(undefined, undefined, keyBackupInfo);
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }

    private async restoreWithSecretStorage(keyBackupInfo: KeyBackupInfo) {
        try {
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            await this.matrixClientStore.restoreKeyBackupWithSecretStorage(keyBackupInfo);
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }
}

export const matrixSecurity = new MatrixSecurity();

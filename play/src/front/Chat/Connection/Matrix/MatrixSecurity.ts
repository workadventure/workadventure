import { MatrixClient, SecretStorage } from "matrix-js-sdk";
import { GeneratedSecretStorageKey, KeyBackupInfo } from "matrix-js-sdk/lib/crypto-api";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";
// eslint-disable-next-line import/no-unresolved
import { openModal } from "svelte-modals";
import { writable } from "svelte/store";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";

let initializingEncryptionPromise: Promise<void> | undefined;

export const isEncryptionRequiredAndNotSet = writable(false);
export type KeyParams = { passphrase?: string; recoveryKey?: string };

export function makeInputToKey(
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

export let matrixClientStore: MatrixClient | null = null;

export const updateMatrixClientStore = (matrixClient: MatrixClient) => {
    matrixClientStore = matrixClient;
};

export async function initClientCryptoConfiguration() {
    if (!matrixClientStore) {
        return Promise.reject(new Error("matrixClientStore is null"));
    }

    if (matrixClientStore.isGuest()) {
        return Promise.reject(new Error("Guest user, no encryption key"));
    }

    const crypto = matrixClientStore.getCrypto();
    if (crypto === undefined) {
        return Promise.reject(new Error("E2EE is not available for this client"));
    }
    if (initializingEncryptionPromise) {
        return Promise.reject(new Error("Encryption already initialized"));
    }

    initializingEncryptionPromise = new Promise<void>((resolve, initializingEncryptionReject) => {
        (async () => {
            const keyBackupInfo = await matrixClientStore?.getKeyBackupVersion();

            const isCrossSigningReady = await crypto.isCrossSigningReady();

            if (!isCrossSigningReady || keyBackupInfo === null) {
                await crypto.bootstrapCrossSigning({
                    authUploadDeviceSigningKeys: async (makeRequest) => {
                        const finished = await new Promise<boolean>((resolve) => {
                            openModal(InteractiveAuthDialog, {
                                matrixClient: matrixClientStore,
                                onFinished: (finished: boolean) => resolve(finished),
                                makeRequest,
                            });
                        });
                        if (!finished) {
                            isEncryptionRequiredAndNotSet.set(true);
                            return initializingEncryptionReject(new Error("Cross-signing key upload auth canceled"));
                        }
                    },
                    setupNewCrossSigning: keyBackupInfo === null,
                });

                await crypto.bootstrapSecretStorage({
                    createSecretStorageKey: async () => {
                        const generatedKey = await new Promise<GeneratedSecretStorageKey | null>((resolve, reject) => {
                            openModal(CreateRecoveryKeyDialog, {
                                crypto,
                                processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
                                    if (generatedKey === undefined) {
                                        return reject(new Error("no generated secret storage key"));
                                    }
                                    resolve(generatedKey);
                                },
                            });
                        });

                        if (generatedKey === null) {
                            isEncryptionRequiredAndNotSet.set(true);
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

                isEncryptionRequiredAndNotSet.set(false);
            }

            if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                await restoreBackupMessages(keyBackupInfo);
            }

            return resolve();
        })().catch((error) => {
            console.error("initClientCryptoConfiguration error: ", error);
            initializingEncryptionPromise = undefined;
            return;
        });
    });

    return;
}

async function restoreBackupMessages(keyBackupInfo: KeyBackupInfo) {
    try {
        if (!matrixClientStore) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }
        const has4s = await matrixClientStore.secretStorage.hasKey();
        const backupRestored = has4s ? await matrixClientStore.isKeyBackupKeyStored() : null;

        const restoredWithCachedKey = await restoreWithCachedKey(keyBackupInfo);
        if (!restoredWithCachedKey && backupRestored) {
            await restoreWithSecretStorage(keyBackupInfo);
        }
    } catch (error) {
        console.error("Unable to restoreBackupMessages : ", error);
    }
    return;
}

async function restoreWithCachedKey(keyBackupInfo: KeyBackupInfo) {
    try {
        if (!matrixClientStore) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }
        await matrixClientStore.restoreKeyBackupWithCache(undefined, undefined, keyBackupInfo);
        return true;
    } catch (error) {
        console.error("Unable to restoreKeyBackupWithCache : ", error);
        return false;
    }
}

async function restoreWithSecretStorage(keyBackupInfo: KeyBackupInfo) {
    try {
        if (!matrixClientStore) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }
        await matrixClientStore.restoreKeyBackupWithSecretStorage(keyBackupInfo);
        return true;
    } catch (error) {
        console.error("Unable to restoreKeyBackupWithCache : ", error);
        return false;
    }
}

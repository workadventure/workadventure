import {  MatrixClient, SecretStorage } from "matrix-js-sdk";
import { GeneratedSecretStorageKey, KeyBackupInfo } from "matrix-js-sdk/lib/crypto-api";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";
import { openModal } from "svelte-modals";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";
import { writable } from "svelte/store";

let  initializingEncryption = false;
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
    try {
        if (!matrixClientStore) {
            throw new Error("matrixClientStore is null");
        }
        
        if(matrixClientStore.isGuest()){
            throw new Error("Guest user, no encryption key");
        }

        const crypto = matrixClientStore.getCrypto();
        if (crypto === undefined) {
            console.error("E2EE is not available for this client");
            return;
        }
        if(initializingEncryption){
            console.error("already initialize");
            return;
        }

        initializingEncryption = true;

        const keyBackupInfo = await matrixClientStore.getKeyBackupVersion();
        const isCrossSigningReady = await crypto.isCrossSigningReady();

        if (!isCrossSigningReady ) {
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
                        initializingEncryption = false;
                        isEncryptionRequiredAndNotSet.set(true);
                        throw new Error("Cross-signing key upload auth canceled");
                    }
                },
            });

            await crypto.bootstrapSecretStorage({
                createSecretStorageKey: async () => {
                    const generatedKey = await new Promise<GeneratedSecretStorageKey | null>((resolve, reject) => {
                        openModal(CreateRecoveryKeyDialog, {
                            crypto,
                            processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
                                if (generatedKey === undefined) {
                                    reject(new Error("no generated secret storage key"));
                                }
                                resolve(generatedKey);
                            },
                        });
                    });
                    if (generatedKey === null) {
                        initializingEncryption = false;
                        isEncryptionRequiredAndNotSet.set(true);
                        throw new Error("createSecretStorageKey : no generated secret storage key");
                    }
                    return Promise.resolve(generatedKey);
                },
                setupNewKeyBackup: keyBackupInfo === null,
                keyBackupInfo: keyBackupInfo ?? undefined,
            });
            isEncryptionRequiredAndNotSet.set(false);
        }
        await restoreBackupMessages(keyBackupInfo);
    } catch (error) {
        console.error("initClientCryptoConfiguration : ", error);
        initializingEncryption = false;
    }
}

async function restoreBackupMessages(keyBackupInfo: KeyBackupInfo | null) {
    try {
        if (!matrixClientStore) {
            throw new Error("matrixClientStore is null");
        }
        const has4s = await matrixClientStore.secretStorage.hasKey();
        const backupRestored = has4s ? await matrixClientStore.isKeyBackupKeyStored() : null;

        if (keyBackupInfo) {
            console.debug("keyBackupInfo : ", keyBackupInfo);
            const restoredWithCachedKey = await restoreWithCachedKey(keyBackupInfo);
            if (!restoredWithCachedKey && backupRestored) {
                await restoreWithSecretStorage(keyBackupInfo);
            }
        }
    } catch (error) {
        console.error("Unable to restoreBackupMessages : ", error);
    }
}

async function restoreWithCachedKey(keyBackupInfo: KeyBackupInfo) {
    try {
        if (!matrixClientStore) {
            throw new Error("matrixClientStore is null");
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
            throw new Error("matrixClientStore is null");
        }
        await matrixClientStore.restoreKeyBackupWithSecretStorage(keyBackupInfo);
        return true;
    } catch (error) {
        console.error("Unable to restoreKeyBackupWithCache : ", error);
        return false;
    }
}

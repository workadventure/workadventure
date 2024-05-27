import { SecretStorage } from "matrix-js-sdk";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";

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

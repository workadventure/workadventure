import { z } from "zod";
/*
export interface ICurve25519AuthData {
    public_key: string;
    private_key_salt?: string;
    private_key_iterations?: number;
    private_key_bits?: number;
}

export interface IAes256AuthData {
    iv: string;
    mac: string;
    private_key_salt?: string;
    private_key_iterations?: number;
}

export interface ISignatures {
    [entity: string]: {
        [keyId: string]: string;
    };
}

export interface ISigned {
    signatures?: ISignatures;
}

export interface IKeyBackupInfo {
    algorithm: string;
    auth_data: ISigned & (ICurve25519AuthData | IAes256AuthData);
    count?: number;
    etag?: string;
    version?: string; // number contained within
}

type SigInfo = {
    deviceId: string;
    valid?: boolean | null; // true: valid, false: invalid, null: cannot attempt validation
    device?: number | null;
    crossSigningId?: boolean;
    deviceTrust?: unknown;
};

export type TrustInfo = {
    usable: boolean; // is the backup trusted, true iff there is a sig that is valid & from a trusted device
    sigs: SigInfo[];
    // eslint-disable-next-line camelcase
    trusted_locally?: boolean;
};

export interface IKeyBackupCheck {
    backupInfo?: IKeyBackupInfo;
    trustInfo: TrustInfo;
}

export interface IDevice {
    keys: Record<string, string>;
    algorithms: string[];
    verified: DeviceVerification;
    known: boolean;
    unsigned?: Record<string, any>;
    signatures?: ISignatures;
}

export interface ISignatures {
    [entity: string]: {
        [keyId: string]: string;
    };
}
*/

enum DeviceVerification {
    Blocked = -1,
    Unverified = 0,
    Verified = 1,
}

export const IKeyBackupCheck = z.object({
    backupInfo: z.object({
        algorithm: z.string(),
        auth_data: z.unknown(),
        count: z.number().optional(),
        etag: z.string().optional(),
        version: z.string().optional()
    }).optional(),
    trustInfo: z.object({
        usable: z.boolean(),
        sigs: z.array(z.object({
            deviceId: z.string(),
            valid: z.boolean().optional().nullable(),
            device: z.object({
                keys: z.record(z.string(), z.string()),
                algorithms: z.array(z.string()),
                verified: z.number(),
                known: z.boolean(),
                unsigned: z.record(z.string(), z.any()).optional(),
                signatures: z.record(z.string(), z.record(z.string(), z.string())).optional()
            }).optional(),
            crossSigningId: z.boolean().optional(),
            deviceTrust: z.unknown()
        })),
        trusted_locally: z.boolean().optional()
    })
}).nullable();

export type IKeyBackupCheck = z.infer<typeof IKeyBackupCheck>;

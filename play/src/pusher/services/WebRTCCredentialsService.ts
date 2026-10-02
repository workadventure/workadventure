import crypto from "crypto";
import { TURN_STATIC_AUTH_SECRET } from "../enums/EnvironmentVariable";

export interface IWebRTCCredentials {
    webRtcUserName: string;
    webRtcPassword: string;
}

export class WebRTCCredentialsService {
    // Coturn (use-auth-secret) checks the timestamp on every request, including the allocation Refresh a
    // browser sends every few minutes: once the credentials expire, a relayed connection that is still
    // in use loses its allocation and drops. The validity must therefore outlive the longest session,
    // not just the time to establish a connection. The front renews its copy well before expiry
    // (TURN_CREDENTIALS_RENEWAL_TIME), so a peer never starts with a nearly-expired set.
    private static readonly CREDENTIAL_VALIDITY_HOURS = 24;

    public generateCredentials(userId: string): IWebRTCCredentials {
        if (!TURN_STATIC_AUTH_SECRET) {
            return { webRtcUserName: "", webRtcPassword: "" };
        }

        return this.getTURNCredentials(userId, TURN_STATIC_AUTH_SECRET);
    }

    private getTURNCredentials(name: string, secret: string): IWebRTCCredentials {
        const unixTimeStamp = this.calculateExpirationTimestamp();
        const username = this.generateUsername(unixTimeStamp, name);
        const password = this.generatePassword(username, secret);

        return { webRtcUserName: username, webRtcPassword: password };
    }

    private calculateExpirationTimestamp(): number {
        return Math.floor(Date.now() / 1000) + WebRTCCredentialsService.CREDENTIAL_VALIDITY_HOURS * 3600;
    }

    private generateUsername(timestamp: number, name: string): string {
        return `${timestamp}:${name}`;
    }

    private generatePassword(username: string, secret: string): string {
        const hmac = crypto.createHmac("sha1", secret);
        hmac.setEncoding("base64");
        hmac.write(username);
        hmac.end();
        const password = String(hmac.read() || "");
        return password;
    }
}

export const webRTCCredentialsService = new WebRTCCredentialsService();

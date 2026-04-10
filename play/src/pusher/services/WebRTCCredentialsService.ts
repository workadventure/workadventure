import crypto from "crypto";
import { TURN_STATIC_AUTH_SECRET } from "../enums/EnvironmentVariable";

export interface IWebRTCCredentials {
    webRtcUserName: string;
    webRtcPassword: string;
}

export class WebRTCCredentialsService {
    private static readonly CREDENTIAL_VALIDITY_HOURS = 4;

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

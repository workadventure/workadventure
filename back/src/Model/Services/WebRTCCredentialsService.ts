import crypto from "crypto";
import { TURN_STATIC_AUTH_SECRET } from "../../Enum/EnvironmentVariable";
import { IWebRTCCredentials } from "../Types/CommunicationTypes";

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
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(username);
        const password = hmac.digest("base64");
        return password;
    }
}

export const webRTCCredentialsService = new WebRTCCredentialsService();

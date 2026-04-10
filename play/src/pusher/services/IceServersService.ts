import { IceServer } from "@workadventure/messages";
import { STUN_SERVER, TURN_SERVER, TURN_USER, TURN_PASSWORD } from "../enums/EnvironmentVariable";
import { webRTCCredentialsService } from "./WebRTCCredentialsService";

/**
 * Service to generate complete ICE server configuration including STUN and TURN servers
 */
export class IceServersService {
    /**
     * Generate complete ICE configuration for a user
     * @param userId - User ID to generate TURN credentials for
     * @returns IceServersAnswer containing all ICE servers (STUN + TURN with credentials)
     */
    public generateIceServers(userId: string): IceServer[] {
        const iceServers: IceServer[] = [];

        // Add STUN servers if configured
        if (STUN_SERVER) {
            iceServers.push(
                IceServer.fromPartial({
                    urls: STUN_SERVER.split(",").map((url: string) => url.trim()),
                })
            );
        }

        // Add TURN servers with credentials if configured
        if (TURN_SERVER) {
            const credentials = webRTCCredentialsService.generateCredentials(userId);

            iceServers.push(
                IceServer.fromPartial({
                    urls: TURN_SERVER.split(",").map((url: string) => url.trim()),
                    username: credentials.webRtcUserName || TURN_USER,
                    credential: credentials.webRtcPassword || TURN_PASSWORD,
                    // Always include credentialType for maximum browser compatibility
                    credentialType: "password",
                })
            );
        }

        return iceServers;
    }
}

export const iceServersService = new IceServersService();

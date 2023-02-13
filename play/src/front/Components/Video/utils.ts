import type { UserSimplePeerInterface } from "../../WebRtc/SimplePeer";
import { STUN_SERVER, TURN_PASSWORD, TURN_SERVER, TURN_USER } from "../../Enum/EnvironmentVariable";
import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";

export function getColorByString(str: string): string | null {
    let hash = 0;
    if (str.length === 0) {
        return null;
    }
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 255;
        const radix = "00" + value.toString(16);
        color += radix.substring(radix.length - 2);
    }
    return color;
}

/**
 * @param color: string
 * @return string
 */
export function getTextColorByBackgroundColor(color: string | null): string {
    if (!color) {
        return "white";
    }
    const rgb = color.slice(1);
    const brightness = Math.round(
        (parseInt(rgb[0] + rgb[1], 16) * 299 +
            parseInt(rgb[2] + rgb[3], 16) * 587 +
            parseInt(rgb[4] + rgb[5], 16) * 114) /
            1000
    );
    return brightness > 125 ? "black" : "white";
}

export function srcObject(node: HTMLVideoElement, stream: MediaStream | null) {
    node.srcObject = stream;
    return {
        update(newStream: MediaStream) {
            if (node.srcObject != newStream) {
                node.srcObject = newStream;
            }
        },
    };
}

export function getIceServersConfig(user: UserSimplePeerInterface): RTCIceServer[] {
    const config: RTCIceServer[] = [];
    if (STUN_SERVER) {
        config.push({
            urls: STUN_SERVER.split(","),
        });
    }
    if (TURN_SERVER) {
        config.push({
            urls: TURN_SERVER.split(","),
            username: user.webRtcUser || TURN_USER,
            credential: user.webRtcPassword || TURN_PASSWORD,
        });
    }
    return config;
}

/**
 * Test STUN and TURN server access
 * @param user UserSimplePeerInterface
 */
export function checkCoturnServer(user: UserSimplePeerInterface) {
    const iceServers = getIceServersConfig(user);
    console.info("checkTURNServer => STUN/TURN server able to test: ", getIceServersConfig(user));

    const pc = new RTCPeerConnection({ iceServers });
    console.info("checkTURNServer => Test STUN Peer Connection: ", pc);

    pc.onicecandidate = (e) => {
        if (!e.candidate) return;

        // Display candidate string e.g
        // candidate:842163049 1 udp 1677729535 XXX.XXX.XX.XXXX 58481 typ srflx raddr 0.0.0.0 rport 0 generation 0 ufrag sXP5 network-cost 999
        console.log("checkTURNServer => onicecandidate => candidate", e.candidate.candidate);

        // If a srflx candidate was found, notify that the STUN server works!
        if (e.candidate.type == "srflx") {
            console.info("checkTURNServer => onicecandidate => The STUN server is reachable!");
            console.info(`   Your Public IP Address is: ${e.candidate.address}`);
            pc.close();
        }

        // If a relay candidate was found, notify that the TURN server works!
        if (e.candidate.type == "relay") {
            console.info("checkTURNServer => onicecandidate => The TURN server is reachable!");
            pc.close();
        }
    };

    // Log errors:
    // Remember that in most of the cases, even if its working, you will find a STUN host lookup received error
    // Chrome tried to look up the IPv6 DNS record for server and got an error in that process. However, it may still be accessible through the IPv4 address
    pc.onicecandidateerror = (e) => {
        console.error("checkTURNServer => onicecandidateerror => The STUN server is on error: ", e);
        helpWebRtcSettingsVisibleStore.set(true);
    };

    pc.createDataChannel("workadventure-peerconnection-test");
    pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => console.error("Check coturn server error", err));
}

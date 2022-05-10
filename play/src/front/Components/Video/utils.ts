import type { UserSimplePeerInterface } from "../../WebRtc/SimplePeer";
import { STUN_SERVER, TURN_PASSWORD, TURN_SERVER, TURN_USER } from "../../Enum/EnvironmentVariable";
import adapter from "webrtc-adapter";

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

export function getSdpTransform(videoBandwidth = 0) {
    return (sdp: string) => {
        sdp = updateBandwidthRestriction(sdp, videoBandwidth, "video");

        return sdp;
    };
}

function updateBandwidthRestriction(sdp: string, bandwidth: integer, mediaType: string): string {
    if (bandwidth <= 0) {
        return sdp;
    }

    let modifier = "AS";
    // Firefox doesn't support "AS"
    if (adapter.browserDetails.browser === "firefox") {
        bandwidth = (bandwidth >>> 0) * 1000;
        modifier = "TIAS";
    }

    for (
        let targetMediaPos = sdp.indexOf(`m=${mediaType}`);
        targetMediaPos !== -1;
        targetMediaPos = sdp.indexOf(`m=${mediaType}`, targetMediaPos + 1)
    ) {
        const nextMediaPos = sdp.indexOf(`m=`, targetMediaPos + 1);
        const nextBWPos = sdp.indexOf(`b=${modifier}:`, targetMediaPos + 1);

        let mediaSlice = sdp.slice(targetMediaPos);
        const mustCreateBWField = nextBWPos === -1 || (nextBWPos > nextMediaPos && nextMediaPos !== -1);
        if (mustCreateBWField) {
            // insert b= after c= line.
            mediaSlice = mediaSlice.replace(/c=IN (.*)(\r?\n)/, `c=IN $1$2b=${modifier}:${bandwidth}$2`);
        } else {
            // update b= with new 'bandwidth'
            mediaSlice = mediaSlice.replace(new RegExp(`b=${modifier}:.*(\r?\n)`), `b=${modifier}:${bandwidth}$1`);
        }

        // update the sdp
        sdp = sdp.slice(0, targetMediaPos) + mediaSlice;
    }

    return sdp;
}

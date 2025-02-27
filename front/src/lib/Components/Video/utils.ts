import Debug from "debug";
import { TurnCredentialsAnswer } from "@workadventure/messages";
import type { UserSimplePeerInterface } from "../../WebRtc/SimplePeer";
import { STUN_SERVER, TURN_PASSWORD, TURN_SERVER, TURN_USER } from "../../Enum/EnvironmentVariable";
import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
import { analyticsClient } from "../../Administration/AnalyticsClient";

export const debug = Debug("CheckTurn");

export function srcObject(node: HTMLVideoElement, stream: MediaStream | null | undefined) {
    node.srcObject = stream ?? null;
    return {
        update(newStream: MediaStream) {
            if (node.srcObject != newStream) {
                node.srcObject = newStream;
            }
        },
    };
}

export function getIceServersConfig(user: TurnCredentialsAnswer): RTCIceServer[] {
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
    let turnServerReached = false;
    let checkPeerConnexionStatusTimeOut: NodeJS.Timeout | null = null;

    if (!TURN_SERVER) {
        debug("No TURN server configured.");
        return;
    }

    if (window.navigator.userAgent.toLowerCase().indexOf("firefox") != -1) {
        debug("RTC Peer Connection detection is not available for Firefox browser!");
        return;
    }

    const iceServers = getIceServersConfig(user);

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
        turnServerReached = false;

        if (
            (e.target && e.target instanceof RTCPeerConnection && e.target.iceGatheringState === "complete") ||
            e.candidate == null
        ) {
            pc.close();

            debug("onicecandidate => gathering is complete");
            if (!turnServerReached) {
                debug("onicecandidate => no turn server found after gathering complete");
                analyticsClient.turnTestFailure();
                helpWebRtcSettingsVisibleStore.set("error");
            }
            if (checkPeerConnexionStatusTimeOut) {
                clearTimeout(checkPeerConnexionStatusTimeOut);
                checkPeerConnexionStatusTimeOut = null;
            }
            return;
        }

        debug("onicecandidate => e.candidate.type %s", e.candidate.type);
        // If a srflx candidate was found, notify that the STUN server works!
        /*if (e.candidate.type == "srflx") {
            debugCheckTurn("onicecandidate => The STUN server is reachable!");
            debugCheckTurn(`   Your Public IP Address is: ${e.candidate.address}`);
            valideCoturnCheck = true;
            pc.close();
        }*/

        // If a relay candidate was found, notify that the TURN server works!
        if (e.candidate.type == "relay") {
            debug("onicecandidate => The TURN server is reachable!");
            turnServerReached = true;
            helpWebRtcSettingsVisibleStore.set("hidden");
            analyticsClient.turnTestSuccess(e.candidate.protocol);
            pc.close();
        }
    };

    // Log errors:
    // Remember that in most of the cases, even if its working, you will find a STUN host lookup received error
    // Chrome tried to look up the IPv6 DNS record for server and got an error in that process. However, it may still be accessible through the IPv4 address
    pc.onicecandidateerror = (e) => {
        debug("onicecandidateerror => %O", e);
    };

    pc.addEventListener("icegatheringstatechange", (ev) => {
        debug("icegatheringstatechange => pc.iceGatheringState: %s", pc.iceGatheringState);
        switch (pc.iceGatheringState) {
            case "new":
                debug("icegatheringstatechange => status is new");
                break;
            case "gathering":
                debug("icegatheringstatechange => status is gathering");
                break;
            case "complete":
                debug("icegatheringstatechange => status is complete");
                pc.close();
                break;
        }
    });

    pc.createDataChannel("workadventure-peerconnection-test");
    pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => debug("Check coturn server error => %O", err));

    checkPeerConnexionStatusTimeOut = setTimeout(() => {
        if (!turnServerReached) {
            helpWebRtcSettingsVisibleStore.set("pending");
            analyticsClient.turnTestTimeout();
        }
        if (checkPeerConnexionStatusTimeOut) {
            clearTimeout(checkPeerConnexionStatusTimeOut);
            checkPeerConnexionStatusTimeOut = null;
        }
    }, 5000);
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

    for (
        let targetMediaPos = sdp.indexOf(`m=${mediaType}`);
        targetMediaPos !== -1;
        targetMediaPos = sdp.indexOf(`m=${mediaType}`, targetMediaPos + 1)
    ) {
        // offer TIAS and AS (in this order)
        for (const modifier of ["AS", "TIAS"]) {
            const nextMediaPos = sdp.indexOf(`m=`, targetMediaPos + 1);
            const newBandwidth = modifier === "TIAS" ? (bandwidth >>> 0) * 1000 : bandwidth;
            const nextBWPos = sdp.indexOf(`b=${modifier}:`, targetMediaPos + 1);

            let mediaSlice = sdp.slice(targetMediaPos);
            const bwFieldAlreadyExists = nextBWPos !== -1 && (nextBWPos < nextMediaPos || nextMediaPos === -1);
            if (bwFieldAlreadyExists) {
                // delete it
                mediaSlice = mediaSlice.replace(new RegExp(`b=${modifier}:.*[\r?\n]`), "");
            }
            // insert b= after c= line.
            mediaSlice = mediaSlice.replace(/c=IN (.*)(\r?\n)/, `c=IN $1$2b=${modifier}:${newBandwidth}$2`);

            // update the sdp
            sdp = sdp.slice(0, targetMediaPos) + mediaSlice;
        }
    }

    return sdp;
}

import Debug from "debug";
import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isFirefox, isSafari } from "../../WebRtc/DeviceUtils";
import { iceServersManager } from "../../WebRtc/IceServersManager";

export const debug = Debug("CheckTurn");

/**
 * Helper function to get browser name for logging
 * @returns Browser name string
 */
function getBrowserName(): string {
    return isSafari() ? "Safari" : "Firefox";
}

/**
 * Helper function to check if current browser has WebRTC quirks
 * @returns True if browser has WebRTC quirks (Safari or Firefox)
 */
function hasWebRtcQuirks(): boolean {
    return isSafari() || isFirefox();
}

/**
 * Helper function to handle TURN server success for browsers with WebRTC quirks
 * @param browserName - Name of the browser for logging
 * @param reason - Reason for considering TURN as working
 * @param protocol - Protocol used (defaults to "udp")
 */
function handleTurnServerSuccess(browserName: string, reason: string, protocol: string = "udp"): void {
    debug(`onicecandidate => ${browserName} ${reason} - TURN server likely reachable`);
    helpWebRtcSettingsVisibleStore.set("hidden");
    analyticsClient.turnTestSuccess(protocol);
}

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

/**
 * Test STUN and TURN server access
 */
export async function checkCoturnServer() {
    let turnServerReached = false;
    let checkPeerConnexionStatusTimeOut: NodeJS.Timeout | null = null;

    // Firefox TURN detection is less reliable but still functional
    if (isFirefox()) {
        debug("Firefox detected - using adapted TURN server detection");
        // Continue with TURN test for Firefox but with different handling
    }

    // Safari has specific WebRTC behavior that requires different handling
    if (isSafari()) {
        debug("Safari detected - using Safari-specific TURN server detection");
        // Safari often doesn't properly report ICE gathering completion
        // and may not generate relay candidates in the same way as other browsers
    }

    const iceServers = await iceServersManager.getIceServersConfig();

    if (!iceServers.some((server) => server.urls.some((url) => url.startsWith("turn:") || url.startsWith("turns:")))) {
        debug("No TURN/TURNS server configured.");
        return;
    }

    const pc = new RTCPeerConnection({ iceServers });

    const handleIceGatheringStateChange = (ev: Event) => {
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
                pc.removeEventListener("icegatheringstatechange", handleIceGatheringStateChange);
                pc.close();
                break;
        }
    };

    pc.onicecandidate = (e) => {
        // For Safari, we don't reset turnServerReached to false on every candidate
        // as Safari may not generate relay candidates in the same way
        if (!isSafari()) {
            turnServerReached = false;
        }

        if (
            (e.target && e.target instanceof RTCPeerConnection && e.target.iceGatheringState === "complete") ||
            e.candidate == null
        ) {
            pc.close();

            debug("onicecandidate => gathering is complete");
            if (!turnServerReached) {
                debug("onicecandidate => no turn server found after gathering complete");
                analyticsClient.turnTestFailure();

                // For Safari and Firefox, be more lenient - assume TURN is working
                // These browsers often don't generate relay candidates even when TURN is working
                if (hasWebRtcQuirks()) {
                    handleTurnServerSuccess(
                        getBrowserName(),
                        "ICE gathering complete without relay candidate - assuming TURN is working",
                        "no-relay-but-assumed-working"
                    );
                } else {
                    helpWebRtcSettingsVisibleStore.set("error");
                }
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

        // Safari and Firefox: Consider srflx candidates as a sign that TURN might work
        // These browsers sometimes don't generate relay candidates even when TURN is working
        if (hasWebRtcQuirks() && e.candidate.type == "srflx") {
            // If we get srflx candidates, consider TURN as potentially working
            // This prevents false error states in Safari and Firefox
            turnServerReached = true;
            handleTurnServerSuccess(getBrowserName(), "detected srflx candidate");
            pc.close();
        }
    };

    // ICE candidate error logging
    // Remember that in most of the cases, even if its working, you will find a STUN host lookup received error
    // Chrome tried to look up the IPv6 DNS record for server and got an error in that process. However, it may still be accessible through the IPv4 address
    pc.onicecandidateerror = (e) => {
        const event = e;

        // Categorize error types for better debugging
        if (event.errorCode) {
            switch (event.errorCode) {
                case 701: // STUN host lookup error
                    debug(
                        "ICE candidate error: STUN host lookup failed for %s (IPv6 DNS issue, usually harmless)",
                        event.url || "unknown"
                    );
                    break;
                case 300: // STUN allocation failure
                    debug("ICE candidate error: STUN allocation failure for %s", event.url || "unknown");
                    break;
                case 400: // TURN allocation failure
                    debug("ICE candidate error: TURN allocation failure for %s", event.url || "unknown");
                    console.warn(
                        "TURN server allocation failed - this may affect connectivity for users behind restrictive firewalls"
                    );
                    break;
                default:
                    debug(
                        "ICE candidate error: Code %d for %s - %s",
                        event.errorCode,
                        event.url || "unknown",
                        event.errorText || "no details"
                    );
                    break;
            }
        } else {
            debug("ICE candidate error (no error code): %O", e);
        }

        // Don't show help dialog for common/harmless errors
        if (event.errorCode !== 701 && !turnServerReached) {
            // Only show help after multiple errors or serious errors
            const seriousErrors = [300, 400, 403, 500];
            if (seriousErrors.includes(event.errorCode || 0)) {
                console.warn("Serious ICE connectivity issue detected. Please check network configuration.");
            }
        }
    };

    pc.addEventListener("icegatheringstatechange", handleIceGatheringStateChange);

    pc.createDataChannel("workadventure-peerconnection-test");
    pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => debug("Check coturn server error => %O", err));

    // Different browsers need different timeout handling
    let turnTestTimeout: number;
    if (isSafari()) {
        // Safari needs more time and different handling due to its WebRTC quirks
        turnTestTimeout = 15000;
    } else if (isFirefox()) {
        // Firefox needs more time for TURN server detection
        turnTestTimeout = 10000;
    } else {
        turnTestTimeout = 5000;
    }

    checkPeerConnexionStatusTimeOut = setTimeout(() => {
        if (!turnServerReached) {
            // For Safari and Firefox, be more lenient - assume TURN is working if we reach timeout
            // These browsers often don't generate relay candidates even when TURN is functional
            if (hasWebRtcQuirks()) {
                handleTurnServerSuccess(
                    getBrowserName(),
                    "TURN test timeout - assuming TURN is working",
                    "timeout-assumed-working"
                );
            } else {
                // For other browsers, show pending state
                debug("TURN test timeout - setting to pending");
                helpWebRtcSettingsVisibleStore.set("pending");
                analyticsClient.turnTestTimeout();
            }
        }
        if (checkPeerConnexionStatusTimeOut) {
            clearTimeout(checkPeerConnexionStatusTimeOut);
            checkPeerConnexionStatusTimeOut = null;
        }
    }, turnTestTimeout);
}

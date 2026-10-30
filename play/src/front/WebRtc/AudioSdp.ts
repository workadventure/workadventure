import { parse, write } from "sdp-transform";

// What LiveKit publishes a microphone with (AudioPresets.music)
export const OPUS_MAX_AVERAGE_BITRATE = 48_000;

/**
 * Tunes the audio sections of a local description, which tells the remote peer how we want to receive its audio:
 * - RED (redundant audio, RFC 2198) first, so that the peer sends it: each packet also carries the previous frame,
 *   which hides isolated losses (Bluetooth and Wi-Fi share the 2.4 GHz radio of a laptop). LiveKit enables it too.
 * - Opus up to 48 kbps instead of the browser default (32 kbps), as LiveKit does.
 * A browser that does not offer RED keeps its Opus-only section: nothing breaks.
 */
export function tuneAudioSdp(sdp: string): string {
    const session = parse(sdp);

    for (const media of session.media) {
        if (media.type !== "audio") {
            continue;
        }
        const payloadTypeOf = (codec: string) => media.rtp.find((rtp) => rtp.codec.toLowerCase() === codec)?.payload;
        const red = payloadTypeOf("red");
        const opus = payloadTypeOf("opus");

        if (red !== undefined && media.payloads !== undefined) {
            const others = media.payloads.split(" ").filter((pt) => pt !== String(red));
            media.payloads = [red, ...others].join(" ");
        }
        const opusFmtp = media.fmtp.find((fmtp) => fmtp.payload === opus);
        if (opusFmtp && !opusFmtp.config.includes("maxaveragebitrate=")) {
            opusFmtp.config += `;maxaveragebitrate=${OPUS_MAX_AVERAGE_BITRATE}`;
        }
    }

    return write(session);
}

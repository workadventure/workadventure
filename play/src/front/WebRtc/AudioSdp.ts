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
    const eol = sdp.includes("\r\n") ? "\r\n" : "\n";
    const lines = sdp.split(eol);

    let sectionStart = -1;
    const tuneSection = (start: number, end: number) => {
        const section = lines.slice(start, end);
        const payloadTypeOf = (codec: string) =>
            section
                .map((line) => line.match(new RegExp(`^a=rtpmap:(\\d+) ${codec}/48000`, "i")))
                .find((match) => match !== null)?.[1];
        const red = payloadTypeOf("red");
        const opus = payloadTypeOf("opus");

        if (red !== undefined) {
            const [media, port, protocol, ...payloadTypes] = lines[start].split(" ");
            lines[start] = [media, port, protocol, red, ...payloadTypes.filter((pt) => pt !== red)].join(" ");
        }
        if (opus !== undefined) {
            for (let i = start; i < end; i++) {
                if (lines[i].startsWith(`a=fmtp:${opus} `) && !lines[i].includes("maxaveragebitrate=")) {
                    lines[i] += `;maxaveragebitrate=${OPUS_MAX_AVERAGE_BITRATE}`;
                }
            }
        }
    };

    for (let i = 0; i <= lines.length; i++) {
        if (i === lines.length || lines[i].startsWith("m=")) {
            if (sectionStart !== -1) {
                tuneSection(sectionStart, i);
            }
            sectionStart = i < lines.length && lines[i].startsWith("m=audio ") ? i : -1;
        }
    }

    return lines.join(eol);
}

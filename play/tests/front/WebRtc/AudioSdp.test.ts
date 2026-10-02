import { describe, expect, it } from "vitest";
import { tuneAudioSdp } from "../../../src/front/WebRtc/AudioSdp";

// Trimmed from a Chrome offer: one audio and one video section
const chromeOffer = [
    "v=0",
    "o=- 1 2 IN IP4 127.0.0.1",
    "m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8",
    "a=mid:0",
    "a=rtpmap:111 opus/48000/2",
    "a=fmtp:111 minptime=10;useinbandfec=1",
    "a=rtpmap:63 red/48000/2",
    "a=fmtp:63 111/111",
    "a=rtpmap:9 G722/8000",
    "m=video 9 UDP/TLS/RTP/SAVPF 96 97 63",
    "a=mid:1",
    "a=rtpmap:96 VP8/90000",
    "a=rtpmap:63 red/90000",
    "",
].join("\r\n");

describe("tuneAudioSdp", () => {
    it("asks for RED first and Opus up to 48 kbps, in the audio section only", () => {
        const lines = tuneAudioSdp(chromeOffer).split("\r\n");

        expect(lines).toContain("m=audio 9 UDP/TLS/RTP/SAVPF 63 111 9 0 8");
        expect(lines).toContain("a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=48000");
        // Video is untouched, even though it has a RED payload type too
        expect(lines).toContain("m=video 9 UDP/TLS/RTP/SAVPF 96 97 63");
    });

    it("leaves an Opus-only section in order and does not override a bitrate already set", () => {
        const sdp = [
            "m=audio 9 RTP/SAVPF 111 0",
            "a=rtpmap:111 opus/48000/2",
            "a=fmtp:111 maxaveragebitrate=64000",
        ].join("\n");

        expect(tuneAudioSdp(sdp)).toBe(sdp);
    });

    it("is idempotent", () => {
        const once = tuneAudioSdp(chromeOffer);

        expect(tuneAudioSdp(once)).toBe(once);
    });
});

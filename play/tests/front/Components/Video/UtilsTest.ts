// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getSdpTransform } from "../../../../src/front/Components/Video/utils";

describe("getSdpTransform()", () => {
    it("should not do anything if bandwidth = 0", () => {
        const bw = 0;
        const originalSdp = `
          m=audio
          c=IN IP4 0.0.0.0
          b=AS:11
          m=video
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          b=AS:22
          m=application
          c=IN IP4 0.0.0.0
          b=AS:33`.replace(/^[\s]*/gm, "");

        const modifiedSdp = getSdpTransform(bw)(originalSdp);
        expect(modifiedSdp).toEqual(originalSdp);
    });

    it("should create the 'b' field of the video media if it doesn't exist", () => {
        const bw = 55;
        const originalSdp = `
          m=audio
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          m=application
          c=IN IP4 0.0.0.0`.replace(/^[\s]*/gm, "");

        const modifiedSdp = getSdpTransform(bw)(originalSdp);
        expect(modifiedSdp).toEqual(expectedDefaultSdp(bw));
    });

    it("should update the 'b' field of the video media if it already exists", () => {
        const bw = 66;
        const originalSdp = `
          m=audio
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          b=AS:11
          m=video
          c=IN IP4 0.0.0.0
          b=AS:22
          m=application
          c=IN IP4 0.0.0.0`.replace(/^[\s]*/gm, "");

        const modifiedSdp = getSdpTransform(bw)(originalSdp);
        expect(modifiedSdp).toEqual(expectedDefaultSdp(bw));
    });

    it("should create and update the 'b' field of each video media if one doesn't exist and the other does", () => {
        const bw = 77;
        const originalSdp = `
          m=audio
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          b=AS:11
          m=video
          c=IN IP4 0.0.0.0
          m=application
          c=IN IP4 0.0.0.0`.replace(/^[\s]*/gm, "");

        const modifiedSdp = getSdpTransform(bw)(originalSdp);
        expect(modifiedSdp).toEqual(expectedDefaultSdp(bw));
    });

    it("should not change the 'b' field of other medias", () => {
        const bw = 88;
        const originalSdp = `
          m=audio
          c=IN IP4 0.0.0.0
          b=AS:11
          m=video
          c=IN IP4 0.0.0.0
          b=AS:22
          m=video
          c=IN IP4 0.0.0.0
          b=AS:33
          m=application
          c=IN IP4 0.0.0.0
          b=AS:44`.replace(/^[\s]*/gm, "");

        const modifiedSdp = getSdpTransform(bw)(originalSdp);
        expect(modifiedSdp).toEqual(expectedFullBWSdp(bw));
    });

    // Expected sdp where the audio and application medias have no 'b' fields
    // and the video medias should have 'b=AS:<bw>'.
    const expectedDefaultSdp = (bw: integer) => {
        return `
          m=audio
          c=IN IP4 0.0.0.0
          m=video
          c=IN IP4 0.0.0.0
          b=AS:${bw}
          m=video
          c=IN IP4 0.0.0.0
          b=AS:${bw}
          m=application
          c=IN IP4 0.0.0.0`.replace(/^[\s]*/gm, "");
    };

    // Expected sdp where the audio and application medias have a 'b' field
    // and the video medias should have 'b=AS:<bw>'.
    const expectedFullBWSdp = (bw: integer) => {
        return `
          m=audio
          c=IN IP4 0.0.0.0
          b=AS:11
          m=video
          c=IN IP4 0.0.0.0
          b=AS:${bw}
          m=video
          c=IN IP4 0.0.0.0
          b=AS:${bw}
          m=application
          c=IN IP4 0.0.0.0
          b=AS:44`.replace(/^[\s]*/gm, "");
    };
});

import { describe, expect, it } from "vitest";
import { shouldFetchUrlPreview } from "../UrlPreviewSettings";

const bothOn = { previewsInCleartextRooms: true, previewsInPrivateMessages: true };
const cleartextOnly = { previewsInCleartextRooms: true, previewsInPrivateMessages: false };

describe("shouldFetchUrlPreview", () => {
    it("previews a cleartext room message when the setting is on", () => {
        expect(shouldFetchUrlPreview({ isProximity: false, isEncrypted: false, ...cleartextOnly })).toBe(true);
    });

    it("does not preview a cleartext room message when the setting is off", () => {
        expect(
            shouldFetchUrlPreview({
                isProximity: false,
                isEncrypted: false,
                previewsInCleartextRooms: false,
                previewsInPrivateMessages: true,
            }),
        ).toBe(false);
    });

    // Asking the homeserver to preview a link out of an encrypted message hands it the
    // very thing the encryption was hiding.
    it("does not preview an encrypted room by default", () => {
        expect(shouldFetchUrlPreview({ isProximity: false, isEncrypted: true, ...cleartextOnly })).toBe(false);
    });

    // Proximity messages are peer to peer; the homeserver never saw them. It must not be
    // classed as "cleartext, so the server knows anyway".
    it("does not preview proximity chat by default", () => {
        expect(shouldFetchUrlPreview({ isProximity: true, isEncrypted: false, ...cleartextOnly })).toBe(false);
    });

    it("previews encrypted and proximity messages once explicitly opted in", () => {
        expect(shouldFetchUrlPreview({ isProximity: false, isEncrypted: true, ...bothOn })).toBe(true);
        expect(shouldFetchUrlPreview({ isProximity: true, isEncrypted: false, ...bothOn })).toBe(true);
    });

    it("treats proximity as private even if the cleartext setting is on and the private one is off", () => {
        expect(shouldFetchUrlPreview({ isProximity: true, isEncrypted: true, ...cleartextOnly })).toBe(false);
    });
});

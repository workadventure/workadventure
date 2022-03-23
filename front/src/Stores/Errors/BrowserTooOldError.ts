export class BrowserTooOldError extends Error {
    static NAME = "BrowserTooOldError";

    constructor() {
        super(
            "Unable to access your camera or microphone. Your browser is too old. Please consider upgrading your browser or try using another browser (we recommend Chrome)."
        );
        this.name = BrowserTooOldError.NAME;
    }
}

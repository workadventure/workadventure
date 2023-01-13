export class MediaStreamConstraintsError extends Error {
    static NAME = "MediaStreamConstraintsError";

    constructor() {
        super(
            "Unable to access your camera or microphone. Your browser is too old. Please consider upgrading your browser or try using a recent version of Chrome."
        );
        this.name = MediaStreamConstraintsError.NAME;
    }
}

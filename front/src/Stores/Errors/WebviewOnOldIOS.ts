export class WebviewOnOldIOS extends Error {
    static NAME = "WebviewOnOldIOS";

    constructor() {
        super(
            "Your iOS version cannot use video/audio in the browser unless you are using Safari. Please switch to Safari or upgrade iOS to 14.3 or above."
        );
        this.name = WebviewOnOldIOS.NAME;
    }
}

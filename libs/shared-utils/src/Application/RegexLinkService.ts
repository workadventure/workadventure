import {LinkServiceInterface} from "./LinkServiceInterface";

export class RegexLinkService implements LinkServiceInterface {
    /**
     *
     * @param matchRegex The regex to match for the link to be valid
     * @param embeddedUrlRegex If this regex matches, the link is already embeddable
     * @param replace The string to replace the link with to get the embeddable URL
     */
    constructor(private matchRegex: RegExp, private embeddedUrlRegex: RegExp, private replace: string) {

    }

    public isValidLink(url: URL): boolean {
        return this.matchRegex.test(url.toString());
    }
    public isEmbeddableLink(url: URL): boolean {
        return this.embeddedUrlRegex.test(url.toString());
    }
    public async getEmbedUrl(url: URL): Promise<URL> {
        return Promise.resolve(new URL(url.toString().replace(this.matchRegex, this.replace)));
    }
}

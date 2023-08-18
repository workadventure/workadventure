import {IframelyLink, IframelyResponse} from "./IframelyResponse";
import axios from "axios";

export interface IframelyAnswer {
    icon: string | undefined;
    title: string | undefined;
    url: string | undefined;
    policies: string[] | undefined;
}

class IframelyService {
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!

    public async embedUrl(url: string): Promise<IframelyAnswer> {
        const data = await this.getIframelyData(url);
        const icon = this.getBestIcon(data, 32);
        const title = data.meta?.title;
        const embedUrl = this.getBestEmbedUrl(data);

        return {
            icon,
            title,
            url: embedUrl?.href,
            policies: embedUrl?.rel,
        };
    }

    private async getIframelyData(url: string): Promise<IframelyResponse> {
        // TODO: make this configurable
        // TODO: make this configurable
        // TODO: make this configurable
        // TODO: make this configurable
        // TODO: make this configurable
        const urlIframely = new URL("http://iframely.workadventure.localhost/iframely");
        urlIframely.searchParams.append("url", url);
        const response = await axios.get(urlIframely.toString());

        return IframelyResponse.parse(response.data);
    }

    /**
     * Returns the best icon for the given iframely response.
     * Will first try to select an SVG icon, then an icon in the optimalSize (if passed) then the icon with the highest resolution.
     */
    private getBestIcon(iframelyResponse: IframelyResponse, optimalSize: number|undefined): string | undefined {
        const icons = iframelyResponse.links?.icon;
        if (!icons) {
            return undefined;
        }

        const svgIcons = icons.filter(icon => icon.type === "image/svg+xml");
        if (svgIcons.length > 0) {
            return svgIcons[0].href;
        }

        if (optimalSize) {
            const optimalIcons = icons.filter(icon => icon.media?.width === optimalSize && icon.media?.height === optimalSize);
            if (optimalIcons.length > 0) {
                return optimalIcons[0].href;
            }
        }

        const bestIcons = icons.sort((icon1, icon2) => {
            return (icon2.media?.width ?? 0) * (icon2.media?.height ?? 0) - (icon1.media?.width ?? 0) * (icon1.media?.height ?? 0);
        });

        return bestIcons[0].href;
    }

    /**
     * Scan the iframely response for a suitable embeddable URL. Returns the URL and the related rels.
     * For the scan, we look in the "links" section of Iframely response for a link with rel "app", or "player" and finally "reader".
     */
    private getBestEmbedUrl(iframelyResponse: IframelyResponse): IframelyLink | undefined {
        const links = iframelyResponse.links;
        if (!links) {
            return undefined;
        }

        const rels = ["app", "player", "reader"];
        for (const rel of rels) {
            const link = links[rel];
            if (link && link.length > 0) {
                return link[0];
            }
        }

        return undefined;
    }
}

export const iframelyService = new IframelyService();
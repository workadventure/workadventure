import {
    CardsService,
    EraserService,
    ExcalidrawService,
    GoogleWorkSpaceService,
    KlaxoonService,
    TldrawService,
    YoutubeService,
} from "..";

export class MediaLinkManager {
    constructor(private mediaLink: string) {}

    getEmbedLink(properties?: { klaxoonId?: string; excalidrawDomains?: string[] }): Promise<string> {
        const mediaUrl = new URL(this.mediaLink);

        if (CardsService.isCardsLink(mediaUrl)) {
            return Promise.resolve(CardsService.getCardsLink(mediaUrl));
        }
        if (EraserService.isEraserLink(mediaUrl)) {
            return Promise.resolve(mediaUrl.toString());
        }
        if (ExcalidrawService.isExcalidrawLink(mediaUrl, properties?.excalidrawDomains)) {
            return Promise.resolve(mediaUrl.toString());
        }
        if (GoogleWorkSpaceService.isGoogleDocsLink(mediaUrl)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleDocsEmbedUrl(mediaUrl));
        }
        if (GoogleWorkSpaceService.isGoogleSheetsLink(mediaUrl)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(mediaUrl));
        }
        if (GoogleWorkSpaceService.isGoogleSlidesLink(mediaUrl)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(mediaUrl));
        }
        if (KlaxoonService.isKlaxoonLink(mediaUrl)) {
            return Promise.resolve(KlaxoonService.getKlaxoonEmbedUrl(mediaUrl, properties?.klaxoonId));
        }
        if (TldrawService.isTldrawLink(mediaUrl)) {
            return Promise.resolve(mediaUrl.toString());
        }
        if (YoutubeService.isYoutubeLink(mediaUrl)) {
            return Promise.resolve(YoutubeService.getYoutubeEmbedUrl(mediaUrl));
        }
        return Promise.resolve(mediaUrl.toString());
    }
}

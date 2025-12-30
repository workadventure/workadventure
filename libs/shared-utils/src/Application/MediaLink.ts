import {
    CardsService,
    EraserService,
    ExcalidrawService,
    GoogleWorkSpaceService,
    KlaxoonService,
    TldrawService,
    YoutubeService,
} from "..";

export const enum defautlNativeIntegrationAppName {
    KLAXOON = "Klaxoon",
    YOUTUBE = "Youtube",
    GOOGLE_DRIVE = "Google Drive",
    GOOGLE_DOCS = "Google Docs",
    GOOGLE_SHEETS = "Google Sheets",
    GOOGLE_SLIDES = "Google Slides",
    ERASER = "Eraser",
    EXCALIDRAW = "Excalidraw",
    CARDS = "Cards",
    TLDRAW = "tldraw",
}

export const enum defautlNativeIntegrationAppId {
    KLAXOON = "klaxoon",
    YOUTUBE = "youtube",
    GOOGLE_DRIVE = "googleDrive",
    GOOGLE_DOCS = "googleDocs",
    GOOGLE_SHEETS = "googleSheets",
    GOOGLE_SLIDES = "googleSlides",
    ERASER = "eraser",
    EXCALIDRAW = "excalidraw",
    CARDS = "cards",
    TLDRAW = "tldraw",
}

export class MediaLinkManager {
    mediaUrlLink: URL;

    constructor(private mediaLink: string) {
        this.mediaUrlLink = new URL(mediaLink);
    }

    getEmbedLink(properties?: { klaxoonId?: string; excalidrawDomains?: string[] }): Promise<string> {
        if (CardsService.isCardsLink(this.mediaUrlLink)) {
            return Promise.resolve(CardsService.getCardsLink(this.mediaUrlLink));
        }
        if (EraserService.isEraserLink(this.mediaUrlLink)) {
            return Promise.resolve(this.mediaUrlLink.toString());
        }
        if (ExcalidrawService.isExcalidrawLink(this.mediaUrlLink, properties?.excalidrawDomains)) {
            return Promise.resolve(this.mediaUrlLink.toString());
        }
        if (GoogleWorkSpaceService.isGoogleDocsLink(this.mediaUrlLink)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleDocsEmbedUrl(this.mediaUrlLink));
        }
        if (GoogleWorkSpaceService.isGoogleSheetsLink(this.mediaUrlLink)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(this.mediaUrlLink));
        }
        if (GoogleWorkSpaceService.isGoogleSlidesLink(this.mediaUrlLink)) {
            return Promise.resolve(GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(this.mediaUrlLink));
        }
        if (KlaxoonService.isKlaxoonLink(this.mediaUrlLink)) {
            return Promise.resolve(KlaxoonService.getKlaxoonEmbedUrl(this.mediaUrlLink, properties?.klaxoonId));
        }
        if (TldrawService.isTldrawLink(this.mediaUrlLink)) {
            return Promise.resolve(this.mediaUrlLink.toString());
        }
        if (YoutubeService.isYoutubeLink(this.mediaUrlLink)) {
            return Promise.resolve(YoutubeService.getYoutubeEmbedUrl(this.mediaUrlLink));
        }
        return Promise.resolve(this.mediaUrlLink.toString());
    }

    linkMatchWithApplicationIdOrName(application: string) {
        switch (application) {
            case defautlNativeIntegrationAppName.KLAXOON:
            case defautlNativeIntegrationAppId.KLAXOON:
                KlaxoonService.validateKlaxoonBasicUrl(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.YOUTUBE:
            case defautlNativeIntegrationAppId.YOUTUBE:
                YoutubeService.isYoutubeLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.GOOGLE_DRIVE:
            case defautlNativeIntegrationAppId.GOOGLE_DRIVE:
                GoogleWorkSpaceService.validateGoogleLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.GOOGLE_DOCS:
            case defautlNativeIntegrationAppId.GOOGLE_DOCS:
                GoogleWorkSpaceService.validateGoogleDocsLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.GOOGLE_SHEETS:
            case defautlNativeIntegrationAppId.GOOGLE_SHEETS:
                GoogleWorkSpaceService.validateGoogleSheetLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.GOOGLE_SLIDES:
            case defautlNativeIntegrationAppId.GOOGLE_SLIDES:
                GoogleWorkSpaceService.validateGoogleSlideLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.ERASER:
            case defautlNativeIntegrationAppId.ERASER:
                EraserService.validateLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.EXCALIDRAW:
            case defautlNativeIntegrationAppId.EXCALIDRAW:
                ExcalidrawService.validateLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.CARDS:
            case defautlNativeIntegrationAppId.CARDS:
                CardsService.validateLink(this.mediaUrlLink);
                break;
            case defautlNativeIntegrationAppName.TLDRAW:
                //Commented because defautlNativeIntegrationAppName.TLDRAW === defautlNativeIntegrationAppId.TLDRAW
                //case defautlNativeIntegrationAppId.TLDRAW:
                TldrawService.validateLink(this.mediaUrlLink);
                break;
            default:
                throw new Error("No match link");
        }
    }
}

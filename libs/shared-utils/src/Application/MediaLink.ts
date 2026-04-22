import {
    CardsService,
    EraserService,
    ExcalidrawService,
    GoogleWorkSpaceService,
    KlaxoonService,
    TldrawService,
    YoutubeService,
} from "..";

export const enum defaultNativeIntegrationAppName {
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

export const enum defaultNativeIntegrationAppId {
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
            case defaultNativeIntegrationAppName.KLAXOON:
            case defaultNativeIntegrationAppId.KLAXOON:
                KlaxoonService.validateKlaxoonBasicUrl(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.YOUTUBE:
            case defaultNativeIntegrationAppId.YOUTUBE:
                YoutubeService.isYoutubeLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.GOOGLE_DRIVE:
            case defaultNativeIntegrationAppId.GOOGLE_DRIVE:
                GoogleWorkSpaceService.validateGoogleLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.GOOGLE_DOCS:
            case defaultNativeIntegrationAppId.GOOGLE_DOCS:
                GoogleWorkSpaceService.validateGoogleDocsLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.GOOGLE_SHEETS:
            case defaultNativeIntegrationAppId.GOOGLE_SHEETS:
                GoogleWorkSpaceService.validateGoogleSheetLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.GOOGLE_SLIDES:
            case defaultNativeIntegrationAppId.GOOGLE_SLIDES:
                GoogleWorkSpaceService.validateGoogleSlideLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.ERASER:
            case defaultNativeIntegrationAppId.ERASER:
                EraserService.validateLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.EXCALIDRAW:
            case defaultNativeIntegrationAppId.EXCALIDRAW:
                ExcalidrawService.validateLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.CARDS:
            case defaultNativeIntegrationAppId.CARDS:
                CardsService.validateLink(this.mediaUrlLink);
                break;
            case defaultNativeIntegrationAppName.TLDRAW:
                //Commented because defaultNativeIntegrationAppName.TLDRAW === defaultNativeIntegrationAppId.TLDRAW
                //case defaultNativeIntegrationAppId.TLDRAW:
                TldrawService.validateLink(this.mediaUrlLink);
                break;
            default:
                throw new Error("No match link");
        }
    }
}

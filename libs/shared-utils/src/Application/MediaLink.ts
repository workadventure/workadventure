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

export async function getEmbedLink(
    url: URL,
    properties?: { klaxoonId?: string; excalidrawDomains?: string[] },
): Promise<string> {
    if (CardsService.isCardsLink(url)) {
        return CardsService.getCardsLink(url);
    }
    if (EraserService.isEraserLink(url)) {
        return url.toString();
    }
    if (ExcalidrawService.isExcalidrawLink(url, properties?.excalidrawDomains)) {
        return url.toString();
    }
    if (GoogleWorkSpaceService.isGoogleDocsLink(url)) {
        return GoogleWorkSpaceService.getGoogleDocsEmbedUrl(url);
    }
    if (GoogleWorkSpaceService.isGoogleSheetsLink(url)) {
        return GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(url);
    }
    if (GoogleWorkSpaceService.isGoogleSlidesLink(url)) {
        return GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(url);
    }
    if (KlaxoonService.isKlaxoonLink(url)) {
        return KlaxoonService.getKlaxoonEmbedUrl(url, properties?.klaxoonId);
    }
    if (TldrawService.isTldrawLink(url)) {
        return url.toString();
    }
    if (YoutubeService.isYoutubeLink(url)) {
        return YoutubeService.getYoutubeEmbedUrl(url);
    }
    return url.toString();
}

/**
 * Throws when the link does not belong to the given application (id or display name).
 */
export function validateLinkForApplication(url: URL, application: string): void {
    switch (application) {
        case defaultNativeIntegrationAppName.KLAXOON:
        case defaultNativeIntegrationAppId.KLAXOON:
            KlaxoonService.validateKlaxoonBasicUrl(url);
            break;
        case defaultNativeIntegrationAppName.YOUTUBE:
        case defaultNativeIntegrationAppId.YOUTUBE:
            YoutubeService.validateYoutubeLink(url);
            break;
        case defaultNativeIntegrationAppName.GOOGLE_DRIVE:
        case defaultNativeIntegrationAppId.GOOGLE_DRIVE:
            GoogleWorkSpaceService.validateGoogleLink(url);
            break;
        case defaultNativeIntegrationAppName.GOOGLE_DOCS:
        case defaultNativeIntegrationAppId.GOOGLE_DOCS:
            GoogleWorkSpaceService.validateGoogleDocsLink(url);
            break;
        case defaultNativeIntegrationAppName.GOOGLE_SHEETS:
        case defaultNativeIntegrationAppId.GOOGLE_SHEETS:
            GoogleWorkSpaceService.validateGoogleSheetLink(url);
            break;
        case defaultNativeIntegrationAppName.GOOGLE_SLIDES:
        case defaultNativeIntegrationAppId.GOOGLE_SLIDES:
            GoogleWorkSpaceService.validateGoogleSlideLink(url);
            break;
        case defaultNativeIntegrationAppName.ERASER:
        case defaultNativeIntegrationAppId.ERASER:
            EraserService.validateLink(url);
            break;
        case defaultNativeIntegrationAppName.EXCALIDRAW:
        case defaultNativeIntegrationAppId.EXCALIDRAW:
            ExcalidrawService.validateLink(url);
            break;
        case defaultNativeIntegrationAppName.CARDS:
        case defaultNativeIntegrationAppId.CARDS:
            CardsService.validateLink(url);
            break;
        case defaultNativeIntegrationAppName.TLDRAW:
            //Commented because defaultNativeIntegrationAppName.TLDRAW === defaultNativeIntegrationAppId.TLDRAW
            //case defaultNativeIntegrationAppId.TLDRAW:
            TldrawService.validateLink(url);
            break;
        default:
            throw new Error("No match link");
    }
}

import type { ApplicationDefinitionInterface } from "@workadventure/messages";
import { defaultNativeIntegrationAppName, KlaxoonService } from "@workadventure/shared-utils";
import {
    CARDS_ENABLED,
    ERASER_ENABLED,
    EXCALIDRAW_DOMAINS,
    EXCALIDRAW_ENABLED,
    GOOGLE_DOCS_ENABLED,
    GOOGLE_DRIVE_ENABLED,
    GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED,
    KLAXOON_CLIENT_ID,
    KLAXOON_ENABLED,
    TLDRAW_ENABLED,
    YOUTUBE_ENABLED,
} from "../../Enum/EnvironmentVariable";

export class ApplicationManager {
    public readonly applications: ApplicationDefinitionInterface[] = [];
    public readonly klaxoonToolActivated: boolean | undefined;
    public readonly klaxoonToolClientId: string | undefined = KLAXOON_CLIENT_ID;
    public readonly youtubeToolActivated: boolean | undefined;
    public readonly googleDocsToolActivated: boolean | undefined;
    public readonly googleSheetsToolActivated: boolean | undefined;
    public readonly googleSlidesToolActivated: boolean | undefined;
    public readonly eraserToolActivated: boolean | undefined;
    public readonly googleDriveToolActivated: boolean | undefined;
    public readonly excalidrawToolActivated: boolean | undefined;
    public readonly excalidrawToolDomains: string[] | undefined = EXCALIDRAW_DOMAINS;
    public readonly cardsToolActivated: boolean | undefined;
    public readonly tldrawToolActivated: boolean | undefined;

    constructor(applications: ApplicationDefinitionInterface[]) {
        // Initialise default application
        const KlaxoonApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.KLAXOON);
        this.klaxoonToolActivated = KlaxoonApp?.enabled ?? KLAXOON_ENABLED;

        if (this.klaxoonToolClientId && this.klaxoonToolActivated) {
            KlaxoonService.initWindowKlaxoonActivityPicker();
        }

        const YoutubeApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.YOUTUBE);
        this.youtubeToolActivated = YoutubeApp?.enabled ?? YOUTUBE_ENABLED;

        const GoogleDriveApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.GOOGLE_DRIVE);
        this.googleDriveToolActivated = GoogleDriveApp?.enabled ?? GOOGLE_DRIVE_ENABLED;

        const GoogleDocsApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.GOOGLE_DOCS);
        this.googleDocsToolActivated = GoogleDocsApp?.enabled ?? GOOGLE_DOCS_ENABLED;

        const GoogleSheetsApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.GOOGLE_SHEETS);
        this.googleSheetsToolActivated = GoogleSheetsApp?.enabled ?? GOOGLE_SHEETS_ENABLED;

        const GoogleSlidesApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.GOOGLE_SLIDES);
        this.googleSlidesToolActivated = GoogleSlidesApp?.enabled ?? GOOGLE_SLIDES_ENABLED;

        const EraserApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.ERASER);
        this.eraserToolActivated = EraserApp?.enabled ?? ERASER_ENABLED;

        const ExcalidrawApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.EXCALIDRAW);
        this.excalidrawToolActivated = ExcalidrawApp?.enabled ?? EXCALIDRAW_ENABLED;

        const CardsApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.CARDS);
        this.cardsToolActivated = CardsApp?.enabled ?? CARDS_ENABLED;

        const TldrawApp = applications?.find((app) => app.name === defaultNativeIntegrationAppName.TLDRAW);
        this.tldrawToolActivated = TldrawApp?.enabled ?? TLDRAW_ENABLED;

        // Set other applications
        for (const app of applications ?? []) {
            if (
                defaultNativeIntegrationAppName.KLAXOON === app.name ||
                defaultNativeIntegrationAppName.YOUTUBE === app.name ||
                defaultNativeIntegrationAppName.GOOGLE_DRIVE === app.name ||
                defaultNativeIntegrationAppName.GOOGLE_DOCS === app.name ||
                defaultNativeIntegrationAppName.GOOGLE_SHEETS === app.name ||
                defaultNativeIntegrationAppName.GOOGLE_SLIDES === app.name ||
                defaultNativeIntegrationAppName.ERASER === app.name ||
                defaultNativeIntegrationAppName.EXCALIDRAW === app.name ||
                defaultNativeIntegrationAppName.CARDS === app.name ||
                defaultNativeIntegrationAppName.TLDRAW === app.name
            ) {
                continue;
            }

            // Save applications in the connection manager to use it in the map editor
            if (applications.find((a) => a.name === app.name) === undefined) {
                this.applications.push(app);
            }
        }
    }
}

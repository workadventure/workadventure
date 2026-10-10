// Loaded on demand (see WhiteboardStore.ts): React and Excalidraw only reach the
// browser when somebody opens a whiteboard.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, MainMenu, exportToSvg, hashElementsVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
// eslint-disable-next-line import/no-unresolved -- only exported under the "development"/"production" conditions, which Vite resolves
import "@excalidraw/excalidraw/index.css";
import type { RoomConnection } from "../Connection/RoomConnection";
import { WhiteboardSession } from "./WhiteboardSession";

// Excalidraw downloads its fonts at runtime. Serve them ourselves (the build copies them next to the
// bundle, see vite.config.ts) rather than letting it fall back to esm.sh.
(window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = (
    import.meta.env.DEV
        ? new URL("/node_modules/@excalidraw/excalidraw/dist/prod/", import.meta.url)
        : new URL("../excalidraw-assets/", import.meta.url)
).toString();

export interface WhiteboardMountOptions {
    connection: RoomConnection;
    areaId: string;
    propertyId: string;
    langCode: string;
    /** Where the board's images live in the map-storage; undefined leaves the image tool off. */
    filesUrl: URL | undefined;
}

export interface MountedWhiteboard {
    destroy(): void;
    /** A picture of the board, for its tile among the cameras; undefined while the board is empty. */
    preview(): Promise<SVGSVGElement | undefined>;
}

export function mountWhiteboard(target: HTMLElement, options: WhiteboardMountOptions): MountedWhiteboard {
    const root = createRoot(target);
    // Read-only until the back sends the scene and says whether we may draw.
    let canWrite = false;
    const session = new WhiteboardSession(
        options.connection,
        options.areaId,
        options.propertyId,
        {
            onCanWriteChange: (value) => {
                canWrite = value;
                render();
            },
        },
        options.filesUrl,
    );

    let excalidrawApi: ExcalidrawImperativeAPI | undefined;
    const onApi = (api: ExcalidrawImperativeAPI) => {
        excalidrawApi = api;
        session.attach(api);
        if (import.meta.env.DEV) {
            // Lets the end-to-end bots read the scene, which is drawn on a canvas.
            (window as Window & { __waWhiteboardApi?: ExcalidrawImperativeAPI }).__waWhiteboardApi = api;
        }
    };

    const render = () => {
        root.render(
            createElement(
                Excalidraw,
                {
                    excalidrawAPI: onApi,
                    isCollaborating: true,
                    viewModeEnabled: !canWrite,
                    langCode: options.langCode,
                    aiEnabled: false,
                    // Embedded web pages would let a collaborator inject content (excalidraw/excalidraw#11930).
                    validateEmbeddable: () => false,
                    UIOptions: {
                        canvasActions: {
                            loadScene: false,
                            saveToActiveFile: false,
                            export: { saveFileToDisk: true },
                        },
                        tools: { image: options.filesUrl !== undefined },
                    },
                    onChange: () => session.onLocalChange(),
                    onPointerUpdate: (payload) => session.onPointerUpdate(payload),
                    onScrollChange: () => session.onScrollChange(),
                },
                // Our own menu, without the links to excalidraw.com, Excalidraw+ and social networks.
                createElement(
                    MainMenu,
                    null,
                    createElement(MainMenu.DefaultItems.Export),
                    createElement(MainMenu.DefaultItems.SaveAsImage),
                    createElement(MainMenu.DefaultItems.SearchMenu),
                    createElement(MainMenu.DefaultItems.Help),
                    createElement(MainMenu.DefaultItems.ToggleTheme),
                    createElement(MainMenu.DefaultItems.ChangeCanvasBackground),
                ),
            ),
        );
    };
    render();

    // Only redrawn when the scene changed since the last picture.
    let previewVersion: number | undefined;
    let previewPicture: SVGSVGElement | undefined;
    const preview = async (): Promise<SVGSVGElement | undefined> => {
        if (!excalidrawApi) {
            return undefined;
        }
        const elements = excalidrawApi.getSceneElements();
        const version = hashElementsVersion(elements);
        if (version !== previewVersion) {
            previewVersion = version;
            previewPicture =
                elements.length === 0
                    ? undefined
                    : await exportToSvg({
                          elements,
                          appState: { ...excalidrawApi.getAppState(), exportBackground: true },
                          files: excalidrawApi.getFiles(),
                          // Drawn in the page, which already holds Excalidraw's fonts.
                          skipInliningFonts: true,
                      });
        }
        return previewPicture;
    };

    return {
        destroy: () => {
            session.destroy();
            root.unmount();
        },
        preview,
    };
}

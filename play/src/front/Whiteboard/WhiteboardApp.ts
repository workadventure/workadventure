// Loaded on demand (see WhiteboardCowebsiteComponent.svelte): React and Excalidraw only reach the
// browser when somebody opens a whiteboard.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
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

    const onApi = (api: ExcalidrawImperativeAPI) => {
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
                    onUserFollow: (payload) => session.onUserFollow(payload),
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

    return {
        destroy: () => {
            session.destroy();
            root.unmount();
        },
    };
}

import { describe, expect, it, vi, beforeEach } from "vitest";

const startGameConnexion = vi.fn();
const get = vi.fn();

vi.mock("../../../src/front/Connection/ConnectionManager", () => ({
    connectionManager: {
        startGameConnexion: () => startGameConnexion(),
    },
}));
vi.mock("@workadventure/map-editor/src/Migrations/WamFileMigration", () => ({
    wamFileMigration: {
        migrate: (wam: { mapUrl: string }) => wam,
    },
}));
vi.mock("../../../src/front/Connection/AxiosUtils", () => ({
    axiosWithRetry: {
        get: (url: string) => get(url),
    },
}));

// Type-only, so it is erased and does not load the module eagerly. The instance under test is
// imported per test, after vi.resetModules(): MapPrefetch keeps its boxes at module scope, and a
// prefetch chain started by one test keeps running into the next one. A fresh module per test is
// the only way each of them describes a single boot.
import type * as MapPrefetch from "../../../src/front/Connection/MapPrefetch";

let prefetchWamFile: typeof MapPrefetch.prefetchWamFile;
let takePrefetchedWamFile: typeof MapPrefetch.takePrefetchedWamFile;
let takePrefetchedTmjFile: typeof MapPrefetch.takePrefetchedTmjFile;

const WAM_URL = "/_/global/maps.example.com/world.wam";
const ABSOLUTE_WAM_URL = new URL(WAM_URL, window.location.href).toString();
const ABSOLUTE_TMJ_URL = new URL("world.tmj", ABSOLUTE_WAM_URL).toString();

function roomResolvingTo(wamUrl: string | undefined) {
    return Promise.resolve({ nextScene: "gameScene", room: { wamUrl } });
}

/** Let the prefetch's promise chain settle before inspecting what it stored. */
const settle = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

describe("WAM prefetch", () => {
    beforeEach(async () => {
        vi.resetModules();
        startGameConnexion.mockReset();
        get.mockReset();
        get.mockReturnValue(Promise.resolve({ data: { mapUrl: "world.tmj" } }));
        ({ prefetchWamFile, takePrefetchedWamFile, takePrefetchedTmjFile } =
            await import("../../../src/front/Connection/MapPrefetch"));
    });

    it("downloads the WAM as soon as the room resolves", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));

        prefetchWamFile();
        await settle();

        expect(get).toHaveBeenCalledWith(ABSOLUTE_WAM_URL);
        await expect(takePrefetchedWamFile(ABSOLUTE_WAM_URL)).resolves.toEqual({ mapUrl: "world.tmj" });
    });

    it("hands the download over only once, so a re-created scene refetches", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));

        prefetchWamFile();
        await settle();

        expect(takePrefetchedWamFile(ABSOLUTE_WAM_URL)).toBeDefined();
        // A portal, a room change or a reconnection rebuilds the scene: it must read the WAM as it
        // is then, not the copy downloaded at boot.
        expect(takePrefetchedWamFile(ABSOLUTE_WAM_URL)).toBeUndefined();
    });

    it("ignores a prefetch for another map", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));

        prefetchWamFile();
        await settle();

        expect(takePrefetchedWamFile(new URL("/other.wam", window.location.href).toString())).toBeUndefined();
    });

    it("downloads nothing for a plain TMJ map", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(undefined));

        prefetchWamFile();
        await settle();

        expect(get).not.toHaveBeenCalled();
    });

    it("downloads nothing when the room resolution fails", async () => {
        startGameConnexion.mockReturnValue(Promise.reject(new Error("no room")));

        prefetchWamFile();
        await settle();

        expect(get).not.toHaveBeenCalled();
    });
});

describe("TMJ prefetch", () => {
    beforeEach(async () => {
        vi.resetModules();
        startGameConnexion.mockReset();
        get.mockReset();
        ({ prefetchWamFile, takePrefetchedWamFile, takePrefetchedTmjFile } =
            await import("../../../src/front/Connection/MapPrefetch"));
    });

    it("chains the TMJ on the WAM, resolving its URL against the WAM's", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));
        get.mockImplementation((url: string) =>
            url === ABSOLUTE_WAM_URL
                ? Promise.resolve({ data: { mapUrl: "world.tmj" } })
                : Promise.resolve({ data: { layers: [] } }),
        );

        prefetchWamFile();
        await settle();
        await settle();

        expect(get).toHaveBeenCalledWith(ABSOLUTE_TMJ_URL);
        await expect(takePrefetchedTmjFile(ABSOLUTE_TMJ_URL)).resolves.toEqual({ layers: [] });
    });

    it("hands the TMJ over only once", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));
        get.mockImplementation((url: string) =>
            url === ABSOLUTE_WAM_URL
                ? Promise.resolve({ data: { mapUrl: "world.tmj" } })
                : Promise.resolve({ data: { layers: [] } }),
        );

        prefetchWamFile();
        await settle();
        await settle();

        expect(takePrefetchedTmjFile(ABSOLUTE_TMJ_URL)).toBeDefined();
        expect(takePrefetchedTmjFile(ABSOLUTE_TMJ_URL)).toBeUndefined();
    });

    it("downloads no TMJ when the WAM fails", async () => {
        startGameConnexion.mockReturnValue(roomResolvingTo(WAM_URL));
        get.mockReturnValue(Promise.reject(new Error("no wam")));

        prefetchWamFile();
        await settle();
        await settle();

        expect(get).not.toHaveBeenCalledWith(ABSOLUTE_TMJ_URL);
    });
});

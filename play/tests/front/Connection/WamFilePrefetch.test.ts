import { describe, expect, it, vi, beforeEach } from "vitest";

const startGameConnexion = vi.fn();
const get = vi.fn();

vi.mock("../../../src/front/Connection/ConnectionManager", () => ({
    connectionManager: {
        startGameConnexion: () => startGameConnexion(),
    },
}));
vi.mock("../../../src/front/Connection/AxiosUtils", () => ({
    axiosWithRetry: {
        get: (url: string) => get(url),
    },
}));

import { prefetchWamFile, takePrefetchedWamFile } from "../../../src/front/Connection/WamFilePrefetch";

const WAM_URL = "/_/global/maps.example.com/world.wam";
const ABSOLUTE_WAM_URL = new URL(WAM_URL, window.location.href).toString();

function roomResolvingTo(wamUrl: string | undefined) {
    return Promise.resolve({ nextScene: "gameScene", room: { wamUrl } });
}

/** Let the prefetch's promise chain settle before inspecting what it stored. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("WAM prefetch", () => {
    beforeEach(() => {
        startGameConnexion.mockReset();
        get.mockReset();
        get.mockReturnValue(Promise.resolve({ data: { mapUrl: "world.tmj" } }));
        // Drain anything a previous test left in the box: the module holds it at module scope.
        takePrefetchedWamFile(ABSOLUTE_WAM_URL);
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

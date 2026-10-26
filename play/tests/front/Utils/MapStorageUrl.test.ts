import { describe, expect, it } from "vitest";
import { getCustomEntityCollectionUrl, getMapStorageRootUrl } from "../../../src/front/Utils/MapStorageUrl";

// PUBLIC_MAP_STORAGE_PREFIX is the pathname of PUBLIC_MAP_STORAGE_URL: "/" for https://example.com, "/map-storage" for
// https://example.com/map-storage (the pathname of https://example.com/map-storage/ keeps its trailing slash), and
// undefined when PUBLIC_MAP_STORAGE_URL is not set.
const ROOT_DOMAIN_WAM_URL = "https://example.com/play.example.com/maps/office.wam";
const SUB_PATH_WAM_URL = "https://example.com/map-storage/play.example.com/maps/office.wam";

describe("MapStorageUrl", () => {
    describe("getMapStorageRootUrl", () => {
        it.each([
            { prefix: "/", wamUrl: ROOT_DOMAIN_WAM_URL, expected: "https://example.com/" },
            { prefix: "/map-storage", wamUrl: SUB_PATH_WAM_URL, expected: "https://example.com/map-storage/" },
            { prefix: "/map-storage/", wamUrl: SUB_PATH_WAM_URL, expected: "https://example.com/map-storage/" },
            { prefix: undefined, wamUrl: ROOT_DOMAIN_WAM_URL, expected: "https://example.com/" },
        ])(
            "should resolve the map-storage root with a trailing slash when the prefix is $prefix",
            ({ prefix, wamUrl, expected }) => {
                const rootUrl = getMapStorageRootUrl(wamUrl, prefix);

                expect(rootUrl.toString()).toBe(expected);
            },
        );
    });

    describe("getCustomEntityCollectionUrl", () => {
        it.each([
            {
                prefix: "/",
                wamUrl: ROOT_DOMAIN_WAM_URL,
                expected: "https://example.com/assets/entities/entities.json",
            },
            {
                prefix: "/map-storage",
                wamUrl: SUB_PATH_WAM_URL,
                expected: "https://example.com/map-storage/assets/entities/entities.json",
            },
            {
                prefix: "/map-storage/",
                wamUrl: SUB_PATH_WAM_URL,
                expected: "https://example.com/map-storage/assets/entities/entities.json",
            },
            {
                prefix: undefined,
                wamUrl: ROOT_DOMAIN_WAM_URL,
                expected: "https://example.com/assets/entities/entities.json",
            },
        ])(
            "should resolve entities.json under the map-storage root when the prefix is $prefix",
            ({ prefix, wamUrl, expected }) => {
                const url = getCustomEntityCollectionUrl(wamUrl, prefix);

                expect(url).toBe(expected);
            },
        );
    });
});

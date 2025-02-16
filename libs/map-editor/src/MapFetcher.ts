import dnsPromises from "dns/promises";
import path from "path";
import ipaddr from "ipaddr.js";
import axios from "axios";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { LocalUrlError } from "./LocalUrlError";
import { WAMFileFormat } from "./types";
import { wamFileMigration } from "./Migrations/WamFileMigration";

class MapFetcher {
    async getMapUrl(
        mapUrl: string | undefined,
        wamUrl: string | undefined,
        internalMapStorageUrl: string | undefined = undefined,
        stripPrefix: string | undefined = undefined
    ): Promise<string> {
        if (mapUrl) {
            return mapUrl;
        }
        if (!wamUrl) {
            throw new Error("Both mapUrl and wamUrl are undefined. Can't get mapUrl.");
        }
        const mapPath = (await this.fetchWamFile(wamUrl, internalMapStorageUrl, stripPrefix)).mapUrl;
        return new URL(mapPath, wamUrl).toString();
    }

    normalizeMapUrl(mapUrl: string, wamUrl: string): string {
        return path.normalize(`${path.dirname(wamUrl)}/${mapUrl}`);
    }

    async fetchWamFile(
        wamUrl: string,
        internalMapStorageUrl: string | undefined,
        stripPrefix: string | undefined
    ): Promise<WAMFileFormat> {
        try {
            const result = await this.fetchFile(wamUrl, true, true, internalMapStorageUrl, stripPrefix);
            const parseResult = WAMFileFormat.safeParse(wamFileMigration.migrate(result.data));
            if (!parseResult) {
                throw new LocalUrlError(`Invalid wam file format for: ${wamUrl}`);
            }
            return result.data as WAMFileFormat;
        } catch {
            throw new LocalUrlError(`Invalid wam file format for: ${wamUrl}`);
        }
    }

    async fetchMap(
        mapUrl: string | undefined,
        wamUrl: string | undefined,
        canLoadLocalUrl = false,
        storeVariableForLocalMaps = false,
        internalMapStorageUrl: string | undefined = undefined,
        stripPrefix: string | undefined = undefined
    ): Promise<ITiledMap> {
        const url = await this.getMapUrl(mapUrl, wamUrl, internalMapStorageUrl, stripPrefix);
        // Before trying to make the query, let's verify the map is actually on the open internet (and not a local test map)

        const res = await this.fetchFile(url, canLoadLocalUrl, storeVariableForLocalMaps);

        const parseResult = ITiledMap.safeParse(res.data);
        if (!parseResult.success) {
            //TODO fixme
            //throw new Error("Invalid map format for map " + mapUrl);
            console.error("Invalid map format for map '" + url + "':", parseResult.error);
        }

        return res.data as ITiledMap;
    }

    public async fetchFile(
        url: string,
        canLoadLocalUrl = false,
        storeVariableForLocalMaps = false,
        internalUrl: string | undefined = undefined,
        stripPrefix: string | undefined = undefined
    ) {
        // Note: mapUrl is provided by the client. A possible attack vector would be to use a rogue DNS server that
        // returns local URLs. Alas, Axios cannot pin a URL to a given IP. So "isLocalUrl" and axios.get could potentially
        // target to different servers (and one could trick axios.get into loading resources on the internal network
        // despite isLocalUrl checking that).
        // We can deem this problem not that important because:
        // - We make sure we are only passing "GET" requests
        // - The result of the query is never displayed to the end user
        if (
            internalUrl === undefined &&
            (await this.isLocalUrl(url)) &&
            !storeVariableForLocalMaps &&
            !canLoadLocalUrl
        ) {
            throw new LocalUrlError('URL for map "' + url + '" targets a local map');
        }

        const headers: Record<string, string> = {};
        if (internalUrl) {
            // Let's rewrite the request to hit the internal URL instead. We will use the X-Forwarded-Host header to
            // tell the map-storage the real domain name.

            const urlObj = new URL(url, internalUrl);
            const domainUrl = urlObj.host;

            headers["X-Forwarded-Host"] = domainUrl;

            let path = urlObj.pathname;
            if (stripPrefix && stripPrefix !== "/" && path.startsWith(stripPrefix)) {
                path = path.substring(stripPrefix.length);
            }

            // Rewrite the URL to use the internalUrl instead
            url = internalUrl + path + urlObj.search;
        }

        return await axios.get<unknown>(url, {
            maxContentLength: 50 * 1024 * 1024, // Max content length: 50MB. Maps should not be bigger
            timeout: 10000, // Timeout after 10 seconds
            headers,
        });
    }

    /**
     * Returns true if the domain name is localhost of *.localhost
     * Returns true if the domain name resolves to an IP address that is "private" (like 10.x.x.x or 192.168.x.x)
     *
     * @private
     */
    async isLocalUrl(url: string): Promise<boolean> {
        if (
            [
                "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
                "http://maps.workadventure.localhost/tests/Properties/mapProperties.json",
                "http://play.workadventure.localhost/~/maps/areas.wam",
            ].includes(url)
        ) {
            // This is an ugly exception case needed for the E2E test at "tests/tests/variables.spec.ts"
            // Otherwise, we cannot test locally maps that are... not local.
            return false;
        }

        const urlObj = new URL(url);
        if (urlObj.hostname === "localhost" || urlObj.hostname.endsWith(".localhost")) {
            return true;
        }

        let addresses = [];
        if (urlObj.hostname.startsWith("[") && urlObj.hostname.endsWith("]")) {
            addresses = [urlObj.hostname.slice(1, -1)];
        } else if (!ipaddr.isValid(urlObj.hostname)) {
            addresses = (await dnsPromises.lookup(urlObj.hostname, { all: true })).map((x) => x.address);
        } else {
            addresses = [urlObj.hostname];
        }

        for (const address of addresses) {
            const addr = ipaddr.parse(address);
            if (addr.range() !== "unicast") {
                return true;
            }
        }

        return false;
    }
}

export const mapFetcher = new MapFetcher();

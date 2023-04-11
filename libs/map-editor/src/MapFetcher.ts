import { Resolver } from "dns";
import { promisify } from "util";
import path from "path";
import ipaddr from "ipaddr.js";
import axios from "axios";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { LocalUrlError } from "./LocalUrlError";
import { WAMFileFormat } from "./types";

class MapFetcher {
    async getMapUrl(
        mapUrl: string | undefined,
        wamUrl: string | undefined,
        canLoadLocalUrl = false,
        storeVariableForLocalMaps = false
    ): Promise<string> {
        if (mapUrl) {
            return mapUrl;
        }
        if (!wamUrl) {
            throw new Error("Both mapUrl and wamUrl are undefined. Can't get mapUrl.");
        }
        const mapPath = (await this.fetchWamFile(wamUrl, canLoadLocalUrl, storeVariableForLocalMaps)).mapUrl;
        return path.normalize(`${path.dirname(wamUrl)}/${mapPath}`);
    }

    private async fetchWamFile(
        wamUrl: string,
        canLoadLocalUrl = false,
        storeVariableForLocalMaps = false
    ): Promise<WAMFileFormat> {
        const result = await this.fetchFile(wamUrl, canLoadLocalUrl, storeVariableForLocalMaps);
        const parseResult = WAMFileFormat.safeParse(result.data);
        if (!parseResult) {
            throw new LocalUrlError(`Invalid wam file format for: ${wamUrl}`);
        } else {
            return result.data as WAMFileFormat;
        }
    }

    async fetchMap(
        mapUrl: string | undefined,
        wamUrl: string | undefined,
        canLoadLocalUrl = false,
        storeVariableForLocalMaps = false
    ): Promise<ITiledMap> {
        const url = await this.getMapUrl(mapUrl, wamUrl);

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

    public async fetchFile(url: string, canLoadLocalUrl = false, storeVariableForLocalMaps = false) {
        // Note: mapUrl is provided by the client. A possible attack vector would be to use a rogue DNS server that
        // returns local URLs. Alas, Axios cannot pin a URL to a given IP. So "isLocalUrl" and axios.get could potentially
        // target to different servers (and one could trick axios.get into loading resources on the internal network
        // despite isLocalUrl checking that).
        // We can deem this problem not that important because:
        // - We make sure we are only passing "GET" requests
        // - The result of the query is never displayed to the end user
        if ((await this.isLocalUrl(url)) && !storeVariableForLocalMaps && !canLoadLocalUrl) {
            throw new LocalUrlError('URL for map "' + url + '" targets a local map');
        }

        return await axios.get<unknown>(url, {
            maxContentLength: 50 * 1024 * 1024, // Max content length: 50MB. Maps should not be bigger
            timeout: 10000, // Timeout after 10 seconds
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
        if (!ipaddr.isValid(urlObj.hostname)) {
            const resolver = new Resolver();
            addresses = await promisify(resolver.resolve).bind(resolver)(urlObj.hostname);
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

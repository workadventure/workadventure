import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
import {
    MetaTagsData,
    RequiredMetaTagsData,
    MapDetailsData,
    isMapDetailsData,
    RoomRedirect,
    isRoomRedirect,
    ErrorApiData,
} from "@workadventure/messages";
import { AxiosResponse } from "axios";
import { ADMIN_API_URL } from "../enums/EnvironmentVariable";
import { adminService } from "./AdminService";

export const MetaTagsDefaultValue: RequiredMetaTagsData = {
    title: "WorkAdventure",
    description:
        "Organize your online event in WorkAdventure to recreate spontaneous social interactions. Connect, collaborate and have fun with your teammates and attendees.",
    author: "WorkAdventure team",
    provider: "WorkAdventure",
    favIcons: [
        {
            rel: "icon",
            sizes: "512x512",
            src: "/static/images/favicons/favicon-512x512.svg",
        },
    ],
    manifestIcons: [
        {
            src: "/static/images/favicons/favicon-512x512.svg",
            sizes: "512x512",
            type: "image/svg",
        },
    ],
    appName: "WorkAdventure",
    shortAppName: "WA",
    themeColor: "#6e1946",
    cardImage: "https://workadventu.re/images/general/logo-og.png",
};

export class MetaTagsBuilder {
    private mapDetails: MapDetailsData | RoomRedirect | ErrorApiData | undefined;

    constructor(private url: string) {}

    public async getMeta(userAgent: string | undefined): Promise<RequiredMetaTagsData> {
        if (ADMIN_API_URL) {
            const metaTags = await this.getMetaFromAdmin();
            if (metaTags) {
                return { ...MetaTagsDefaultValue, ...metaTags };
            }
        }
        userAgent = userAgent || "";
        // Let's only populate the metadata for bots. For normal users, this is useless, and it wastes time
        // downloading the map from the Pusher.
        userAgent = userAgent.toLowerCase();
        // "bot" covers Twitter and Google
        // "facebook" covers obviously Facebook
        // "preview" covers Bing and Microsoft products
        if (userAgent.includes("bot") || userAgent.includes("facebook") || userAgent.includes("preview")) {
            return (await this.getMetaFromFile()) || MetaTagsDefaultValue;
        }

        return MetaTagsDefaultValue;
    }

    private async fetchMapDetailsData(): Promise<MapDetailsData | undefined> {
        if (!ADMIN_API_URL) {
            return undefined;
        }

        const fetchedData = await this.fetchMapDetails();

        const checkMapDetails = isMapDetailsData.safeParse(fetchedData);
        return checkMapDetails.success ? checkMapDetails.data : undefined;
    }

    private async fetchMapDetails(): Promise<MapDetailsData | RoomRedirect | ErrorApiData | undefined> {
        if (!ADMIN_API_URL) {
            return undefined;
        }
        if (this.mapDetails) {
            return this.mapDetails;
        }

        this.mapDetails = await adminService.fetchMapDetails(this.url);

        return this.mapDetails;
    }

    private async getMetaFromAdmin(): Promise<MetaTagsData | undefined> {
        try {
            const mapDetails = await this.fetchMapDetailsData();
            if (mapDetails === undefined) {
                return undefined;
            }
            return mapDetails.metatags ?? undefined;
        } catch (e) {
            console.warn(`Error on getting map details ${e}`);
            return undefined;
        }
    }

    private async fetchMapFile(url: string, nbRedirect = 0): Promise<ITiledMap | undefined> {
        // Note: we read the map file ONLY if the request comes from a bot.
        // Otherwise, the map file is already read in the Game scene!

        // TODO: we need to cache the call to the mapUrl to avoid too many calls (possibly setting up axios to use etags too!)

        const response = await adminService.fetchMapDetails(this.url);
        const roomRedirect = isRoomRedirect.safeParse(response);
        if (roomRedirect.success) {
            if (nbRedirect > 10) {
                // We don't want to redirect too much, it's probably a loop
                return undefined;
            }
            return this.fetchMapFile(roomRedirect.data.redirectUrl, nbRedirect + 1);
        }

        const mapDetails = isMapDetailsData.safeParse(response);
        if (!mapDetails.success) {
            // On a redirect we should instead loop
            return undefined;
        }

        const mapUrl = await mapFetcher.getMapUrl(mapDetails.data.mapUrl, mapDetails.data.wamUrl);
        let fetchedData: AxiosResponse;
        try {
            fetchedData = await mapFetcher.fetchFile(mapUrl);
        } catch (e) {
            console.info(
                "Error on getting map file",
                mapUrl,
                "for room url",
                url,
                ". The URL was requested by a bot so this might be normal.",
                e
            );
            return undefined;
        }

        const checkMapFile = ITiledMap.safeParse(fetchedData.data);
        return checkMapFile.success ? checkMapFile.data : undefined;
    }

    private metaValuesFromMapFile(mapFile: ITiledMap): RequiredMetaTagsData {
        if (!mapFile.properties) {
            return MetaTagsDefaultValue;
        }

        const mapNameProperty = mapFile.properties.find((property) => property.name === "mapName");
        const mapDescriptionProperty = mapFile.properties.find((property) => property.name === "mapDescription");

        const mapNameValue = mapNameProperty?.value;
        const mapDescriptionValue = mapDescriptionProperty?.value;

        return {
            title:
                typeof mapNameValue === "string"
                    ? `${MetaTagsDefaultValue.title} - ${mapNameValue}`
                    : MetaTagsDefaultValue.title,
            description:
                typeof mapDescriptionValue === "string" ? mapDescriptionValue : MetaTagsDefaultValue.description,
            author: MetaTagsDefaultValue.author,
            provider: MetaTagsDefaultValue.provider,
            favIcons: MetaTagsDefaultValue.favIcons,
            manifestIcons: MetaTagsDefaultValue.manifestIcons,
            appName: MetaTagsDefaultValue.appName,
            shortAppName: MetaTagsDefaultValue.shortAppName,
            themeColor: MetaTagsDefaultValue.themeColor,
            cardImage: MetaTagsDefaultValue.cardImage,
        };
    }

    private async getMetaFromFile(): Promise<RequiredMetaTagsData | undefined> {
        let mapFile: ITiledMap | undefined;

        try {
            mapFile = await this.fetchMapFile(this.url);
        } catch (e) {
            console.error(`Error on getting map file ${e}`);
        }

        if (!mapFile) {
            return undefined;
        }

        return this.metaValuesFromMapFile(mapFile);
    }

    public async getRedirectUrl(): Promise<string | undefined> {
        const mapDetails = await this.fetchMapDetails();
        const safeParse = isRoomRedirect.safeParse(mapDetails);
        if (safeParse.success) {
            return safeParse.data.redirectUrl;
        }
        return undefined;
    }

    public async getMapDetails(): Promise<MapDetailsData | undefined> {
        const mapDetails = await this.fetchMapDetails();
        const safeParse = isMapDetailsData.safeParse(mapDetails);
        if (safeParse.success) {
            return safeParse.data;
        }
        return undefined;
    }
}

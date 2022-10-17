import { load } from "cheerio";
import { ITiledMap } from "@workadventure/tiled-map-type-guard";
import { isMapDetailsData } from "../../messages/JsonMessages/MapDetailsData";
import { adminService } from "./AdminService";
import axios from "axios";
import { ADMIN_API_URL } from "../enums/EnvironmentVariable";
import type { MetaTagsData, RequiredMetaTagsData, MapDetailsData } from "../../messages/JsonMessages/MapDetailsData";

export const MetaTagsDefaultValue: RequiredMetaTagsData = {
    title: "WorkAdventure",
    description: "Virtual space for your company, team, metaverse, friends...",
    favIcons: [
        {
            rel: "icon",
            sizes: "16x16",
            src: "/static/images/favicons/favicon-16x16.png",
        },
        {
            rel: "icon",
            sizes: "32x32",
            src: "/static/images/favicons/favicon-32x32.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "57x57",
            src: "/static/images/favicons/apple-icon-57x57.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "/static/images/favicons/apple-icon-60x60.png",
            src: "60x60",
        },
        {
            rel: "apple-touch-icon",
            sizes: "/static/images/favicons/apple-icon-72x72.png",
            src: "72x72",
        },
        {
            rel: "apple-touch-icon",
            sizes: "/static/images/favicons/apple-icon-76x76.png",
            src: "76x76",
        },
        {
            rel: "icon",
            sizes: "96x96",
            src: "/static/images/favicons/favicon-96x96.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "114x114",
            src: "static/images/favicons/apple-icon-114x114.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "120x120",
            src: "/static/images/favicons/apple-icon-120x120.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "144x144",
            src: "/static/images/favicons/apple-icon-144x144.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "152x152",
            src: "/static/images/favicons/apple-icon-152x152.png",
        },
        {
            rel: "apple-touch-icon",
            sizes: "180x180",
            src: "/static/images/favicons/apple-icon-180x180.png",
        },
        {
            rel: "icon",
            sizes: "192x192",
            src: "/static/images/favicons/android-icon-192x192.png",
        },
    ],
    appName: "WorkAdventure",
    shortAppName: "WA",
    themeColor: "#000000",
    cardImage: "https://workadventu.re/images/general/logo-og.png",
};

export class MetaTagsBuilder {
    constructor(private htmlFile: Buffer, private url: string) {}

    async build(): Promise<Buffer> {
        const metaTagsValues = ADMIN_API_URL
            ? { ...MetaTagsDefaultValue, ...(await this.getMetaFromAdmin()) }
            : await this.getMetaFromFile();

        if (!metaTagsValues) {
            return this.htmlFile;
        }

        return this.render(metaTagsValues);
    }

    private async fetchMapDetails(): Promise<MapDetailsData | undefined> {
        if (!ADMIN_API_URL) {
            return undefined;
        }

        const fetchedData = await adminService.fetchMapDetails(this.url);

        const checkMapDetails = isMapDetailsData.safeParse(fetchedData);
        return checkMapDetails.success ? checkMapDetails.data : undefined;
    }

    private async getMetaFromAdmin(): Promise<MetaTagsData | undefined> {
        try {
            const mapDetails = await this.fetchMapDetails();
            if (mapDetails === undefined) {
                return undefined;
            }
            return mapDetails.metatags ?? undefined;
        } catch (e) {
            console.error("Error on getting map details", e);
            return undefined;
        }
    }

    private async fetchMapFile(): Promise<ITiledMap | undefined> {
        const urlObject = new URL(this.url);
        let mapUrl = urlObject.pathname;
        const urlParsed = mapUrl.substring(1).split("/");
        mapUrl = "http://" + urlParsed.splice(2, urlParsed.length - 1).join("/");

        const fetchedData = await axios.get(mapUrl);

        const checkMapFile = ITiledMap.safeParse(fetchedData.data);
        return checkMapFile.success ? checkMapFile.data : undefined;
    }

    private metaValuesFromMapFile(mapFile: ITiledMap): RequiredMetaTagsData {
        if (!mapFile.properties) {
            return MetaTagsDefaultValue;
        }

        const mapNameProperty = mapFile.properties.find((property) => property.name === "mapName");
        const mapDescriptionProperty = mapFile.properties.find((property) => property.name === "mapDescription");

        return {
            title: mapNameProperty?.value
                ? `${MetaTagsDefaultValue.title} - ${String(mapNameProperty.value)}`
                : MetaTagsDefaultValue.title,
            description: mapDescriptionProperty?.value
                ? String(mapDescriptionProperty.value)
                : MetaTagsDefaultValue.description,
            favIcons: MetaTagsDefaultValue.favIcons,
            appName: MetaTagsDefaultValue.appName,
            shortAppName: MetaTagsDefaultValue.shortAppName,
            themeColor: MetaTagsDefaultValue.themeColor,
            cardImage: MetaTagsDefaultValue.cardImage,
        };
    }

    private async getMetaFromFile(): Promise<RequiredMetaTagsData | undefined> {
        let mapFile: ITiledMap | undefined;

        try {
            mapFile = await this.fetchMapFile();
        } catch (e) {
            console.error("Error on getting map file", e);
        }

        if (!mapFile) {
            return mapFile;
        }

        return this.metaValuesFromMapFile(mapFile);
    }

    render(metaValues: RequiredMetaTagsData): Buffer {
        const $ = load(this.htmlFile);

        $("title").text(metaValues.title);
        $("meta[name=description]").attr("content", metaValues.description);

        $("meta[name=theme-color]").attr("content", metaValues.themeColor);
        $("meta[name=msapplication-TileColor]").attr("content", metaValues.themeColor);
        $("meta[name=msapplication-TileImage]").attr(
            "content",
            metaValues.favIcons[metaValues.favIcons.length - 1].src
        );

        $("meta[property=og:url]").attr("content", this.url);
        $("meta[property=og:title]").attr("content", metaValues.title);
        $("meta[property=og:description]").attr("content", metaValues.description);
        $("meta[property=og:image]").attr("content", metaValues.cardImage);

        $("meta[property=twitter:url]").attr("content", this.url);
        $("meta[property=twitter:title]").attr("content", metaValues.title);
        $("meta[property=twitter:description]").attr("content", metaValues.description);
        $("meta[property=twitter:image]").attr("content", metaValues.cardImage);

        for (const favicon of metaValues.favIcons) {
            $(`link[sizes=${favicon.sizes}]`).attr("href", favicon.src);
        }

        return Buffer.from($.html(), "utf8");
    }
}

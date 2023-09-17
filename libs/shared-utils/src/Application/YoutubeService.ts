import axios, { AxiosResponse } from "axios";
import { YoutubeException } from "./Exception/GoogleWorkSpaceException";

// Create type data for Youtube embed
export type YoutubeEmbedData = {
    title: string;
    html: string;
};

const cashManagement: Map<string, YoutubeEmbedData> = new Map();

const getUrlFromHtml = (html: string) => {
    const div = document.createElement("div");
    div.insertAdjacentHTML("beforeend", html);
    const iframe: HTMLIFrameElement = div.firstChild as HTMLIFrameElement;
    return iframe.src;
};

const genreateUrlOembed = (url: URL) => {
    const urlToFetch = new URL("https://www.youtube.com/oembed");
    urlToFetch.searchParams.set("url", url.toString());
    urlToFetch.searchParams.set("format", "json");
    return urlToFetch.toString();
};

export const getYoutubeEmbedUrl = async (url: URL): Promise<string> => {
    const link = url.toString();
    if (isEmbedableYoutubeLink(url)) return link;
    const urlToFetch = genreateUrlOembed(url);
    if (cashManagement.has(urlToFetch)) {
        return getUrlFromHtml((cashManagement.get(urlToFetch) as YoutubeEmbedData).html);
    }
    return await axios
        .get(urlToFetch)
        .then((res: AxiosResponse<YoutubeEmbedData>) => {
            cashManagement.set(urlToFetch, res.data);
            const html = res.data.html;
            if (html == undefined) throw new Error("No html found");
            return getUrlFromHtml(html);
        })
        .catch((err) => {
            throw new YoutubeException();
        });
};

// Create function to check if the link is a Youtube link
export const isYoutubeLink = (url: URL): boolean => {
    return url.toString().indexOf("youtube") > -1;
};

// Create function to check if the Youtbe link in parameter is embedable or not
export const isEmbedableYoutubeLink = (url: URL): boolean => {
    const link = url.toString();
    return link.indexOf("embed") > -1;
};

// Get title from youtube link save in cash
export const getTitleFromYoutubeUrl = (url: URL): string | undefined => {
    return cashManagement.get(genreateUrlOembed(url))?.title;
};

import axios, { AxiosResponse } from "axios";
import { YoutubeException } from "./Exception/GoogleWorkSpaceException";

export const getYoutubeEmbedUrl = async (url: URL): Promise<string> => {
    const link = url.toString();
    if (isEmbedableYoutubeLink(url)) return link;
    return await axios
        .get(`https://www.youtube.com/oembed?url=${link}&format:json`)
        .then((res: AxiosResponse<{ html: string | undefined }>) => {
            const html = res.data.html;
            if (html == undefined) throw new Error("No html found");
            const div = document.createElement("div");
            div.insertAdjacentHTML("beforeend", html);
            const iframe: HTMLIFrameElement = div.firstChild as HTMLIFrameElement;
            return iframe.src;
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

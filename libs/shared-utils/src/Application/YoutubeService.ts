import axios, { AxiosResponse } from "axios";

export const getYoutubeEmbedUrl = async (url: URL): Promise<string> => {
    const link = url.toString();
    if (link.indexOf("embed") > -1) return link;
    return await axios
        .get(`https://www.youtube.com/oembed?url=${link}&format:json`)
        .then((res: AxiosResponse<{ html: string | undefined }>) => {
            const html = res.data.html;
            if (html == undefined) throw new Error("No html found");
            const div = document.createElement("div");
            div.insertAdjacentHTML("beforeend", html);
            const iframe: HTMLIFrameElement = div.firstChild as HTMLIFrameElement;
            return iframe.src;
        });
};

import axios from "axios";

export const getYoutubeEmbedUrl = async (url: URL): Promise<string> => {
    const link = url.toString();
    if (link.indexOf("embed") > -1) return link;
    return await axios.get(`https://www.youtube.com/oembed?url=${link}&format:json`).then((res) => {
        const html = res.data.html;
        const div = document.createElement("div");
        div.insertAdjacentHTML("beforeend", html);
        const iframe: HTMLIFrameElement = div.firstChild as HTMLIFrameElement;
        return iframe.src;
    });
};

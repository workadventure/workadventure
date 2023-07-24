import {
    GoogleDocsException,
    GoogleSheetsException,
    GoogleSlidesException,
} from "./Exception/GoogleWorkSpaceException";

export const getGoogleDocsEmbedUrl = (url: URL): string => {
    const link = url.toString();
    if (link.indexOf("/document/") === -1) throw new GoogleDocsException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

export const getGoogleSheetsEmbedUrl = (url: URL): string => {
    const link = url.toString();
    if (link.indexOf("/spreadsheets/") === -1) throw new GoogleSheetsException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

export const getGoogleSlidesEmbedUrl = (url: URL): string => {
    const link = url.toString();
    if (link.indexOf("/presentation/") === -1) throw new GoogleSlidesException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

function getGoogleWorkSpaceEmbedUrl(url: URL): string {
    const link = url.toString();
    if (link.indexOf("embed") > -1) return link;
    url.searchParams.set("embedded", "true");
    console.log("url", url);
    return url.toString();
}

import {
    GoogleDocsException,
    GoogleSheetsException,
    GoogleSlidesException,
} from "./Exception/GoogleWorkSpaceException";

export const getGoogleDocsEmbedUrl = (url: URL): string => {
    if (!isGoogleDocsLink(url)) throw new GoogleDocsException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

export const getGoogleSheetsEmbedUrl = (url: URL): string => {
    if (!isGoogleSheetsLink(url)) throw new GoogleSheetsException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

export const getGoogleSlidesEmbedUrl = (url: URL): string => {
    if (!isGoogleSlidesLink(url)) throw new GoogleSlidesException();
    return getGoogleWorkSpaceEmbedUrl(url);
};

function getGoogleWorkSpaceEmbedUrl(url: URL): string {
    const link = url.toString();
    if (isEmbedableGooglWorkSapceLink(url)) return link;
    url.searchParams.set("embedded", "true");
    return url.toString();
}

// create function to check if the link is a Google Docs link
export const isGoogleDocsLink = (url: URL): boolean => {
    return url.toString().indexOf("/document/") > -1;
};

// create function to check if the link is a Google Sheets link
export const isGoogleSheetsLink = (url: URL): boolean => {
    return url.toString().indexOf("/spreadsheets/") > -1;
};

// create function to check if the link is a Google Slides link
export const isGoogleSlidesLink = (url: URL): boolean => {
    return url.toString().indexOf("/presentation/") > -1;
};

// create function to check if the Google WorkSpace link in parameter is embedable or not
export const isEmbedableGooglWorkSapceLink = (url: URL): boolean => {
    return url.searchParams.get("embedded") === "true";
};

// create function get basic url of Google WorkSpace link
export const getGoogleWorkSpaceBasicUrl = (url: URL): string => {
    if (!isEmbedableGooglWorkSapceLink(url)) return url.toString();
    url.searchParams.delete("embedded");
    return url.toString();
};

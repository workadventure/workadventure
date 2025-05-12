import { asError } from "catch-unknown";
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

export function getGoogleWorkSpaceEmbedUrl(url: URL): string {
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

// declare Google Picker API
declare global {
    interface Window {
        google: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: TokenClientConfig) => TokenClient;
                };
            };
            picker: {
                PickerBuilder: new () => PickerBuilder;
                Feature: {
                    NAV_HIDDEN: string;
                    MULTISELECT_ENABLED: string;
                };
                ViewId: {
                    DOCS: string; // All Google Drive document types.
                    DOCS_IMAGES: string; // Google Drive photos.
                    DOCS_IMAGES_AND_VIDEOS: string; // Google Drive photos and videos.
                    DOCS_VIDEOS: string; // Google Drive videos.
                    DOCUMENTS: string; // Google Drive Documents.
                    DRAWINGS: string; // Google Drive Drawings.
                    FOLDERS: string; // Google Drive Folders.
                    FORMS: string; // Google Drive Forms.
                    PDFS: string; // PDF files stored in Google Drive.
                    PRESENTATIONS: string; // Google Drive Presentations.
                    SPREADSHEETS: string; // Google Drive Spreadsheets.
                };
                DocsUploadView: new () => DocsUploadView;
                Response: {
                    DOCUMENTS: number;
                };
                Document: {
                    ID: number;
                    EMBEDDABLE_URL: number;
                    DESCRIPTION: number;
                    DURATION: number;
                    ICON_URL: number;
                    IS_NEW: number;
                    LAST_EDITED_UTC: number;
                    MIME_TYPE: number;
                    NUM_CHILDREN: number;
                    PARENT_ID: number;
                    SERVICE_ID: number;
                    THUMBNAILS: number;
                    TYPE: number;
                    URL: number;
                };
                Action: {
                    PICKED: string;
                    CANCEL: string;
                };
            };
        };
        gapi: {
            client: {
                drive: {
                    files: {
                        get: (config: { fileId: string; fields: string }) => Promise<unknown>;
                    };
                };
            };
        };
        accessToken: string;
        pickerInited: boolean;
        gisInited: boolean;
    }
}
interface PickerBuilder {
    enableFeature: (feature: string) => PickerBuilder;
    addView: (view: string | DocsUploadView) => PickerBuilder;
    setAppId: (appId: string) => PickerBuilder;
    setOAuthToken: (accessToken: string) => PickerBuilder;
    setCallback: (callback: (data: PickerEvent) => void) => PickerBuilder;
    build: () => Picker;
    setVisible: (visible: boolean) => void;
}
interface DocsUploadView {
    setParent: (folderId: string) => DocsUploadView;
}
interface Picker {
    setVisible: (visible: boolean) => void;
}
interface TokenClient {
    requestAccessToken: (config: { prompt: string }) => void;
}
interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (tokenResponse: TokenResponse) => Promise<void>;
}

/**
 * A TokenResponse JavaScript object will be passed to your callback
 * method (as defined in TokenClientConfig) in the popup UX.
 */
interface TokenResponse {
    /**
     * The access token of a successful token response.
     */
    access_token: string;
}

interface PickerEvent {
    [key: string | number]: Array<string> | string;
}

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/drive";

export const initGooglePicker = (
    clientId: string,
    appId: string,
    viewId = window.google.picker.ViewId.DOCS
): Promise<string> => {
    if (window.accessToken) return showGooglePicker(appId, window.accessToken, viewId);
    if (!window.pickerInited || !window.gisInited) return Promise.reject(new Error("Google Picker not inited"));
    return new Promise((reseolve, reject) => {
        window.google.accounts.oauth2
            .initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: async (tokenResponse: TokenResponse): Promise<void> => {
                    console.log("initGooglePicker => callback", tokenResponse, tokenResponse.access_token);
                    window.accessToken = tokenResponse.access_token;
                    try {
                        const embedUrlPicked = await showGooglePicker(appId, tokenResponse.access_token, viewId);
                        reseolve(embedUrlPicked);
                    } catch (e) {
                        reject(asError(e));
                    }
                }, // defined later
            })
            .requestAccessToken({ prompt: "consent" });
    });
};

export const showGooglePicker = (appId: string, accessToken: string, viewId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const docView = new window.google.picker.DocsUploadView();
        const picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
            .addView(viewId)
            .addView(docView)
            .setAppId(appId)
            .setOAuthToken(accessToken)
            .setCallback((data: PickerEvent) => {
                try {
                    if (data.action !== window.google.picker.Action.PICKED) return;
                    const document = data[window.google.picker.Response.DOCUMENTS][0];
                    const embedUrl = document[window.google.picker.Document.EMBEDDABLE_URL];
                    resolve(embedUrl);
                } catch (e) {
                    reject(asError(e));
                }
            })
            .build();
        picker.setVisible(true);
    });
};

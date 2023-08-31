import axios, {isAxiosError} from "axios";
import Debug from "debug";

const debug = Debug("embeddableService");

export interface EmbeddableResponse {
    url: string;
    state: boolean;
    embeddable: boolean;
    message?: string | undefined;
}

/**
 * A service to check if URLs can be embedded in the map and to return metadata related to the URL.
 */
class EmbeddableService {
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!
    // TODO: cache results!!!

    public async embedUrl(url: string): Promise<EmbeddableResponse> {
        const processError = (error: unknown): EmbeddableResponse => {
            // If the error is a 999 error, it means that this is LinkedIn that return this error code because the website is not embeddable and is not reachable by axios
            if (isAxiosError(error) && error.response?.status === 999) {
                return {
                    state: true,
                    embeddable: false,
                    url,
                };
            } else {
                debug(`SocketManager => embeddableUrl : ${url} ${error}`);
                // If the URL is not reachable, we send a message to the client
                // Catch is used to avoid crash if the client is disconnected
                return {
                    state: false,
                    embeddable: false,
                    message: "URL is not reachable",
                    url,
                }
            }
        };

        try {
            const response = await axios
                .head(url, { timeout: 5_000 });
            return {
                state: true,
                embeddable: !response.headers["x-frame-options"],
                url,
            }
        } catch (error: unknown) {
            // If response from server is "Method not allowed", we try to do a GET request
            if (isAxiosError(error) && error.response?.status === 405) {
                try {
                    const responseGet = await axios
                        .get(url, { timeout: 5_000, maxContentLength: 50_000_000 });
                    return {
                        state: true,
                        embeddable: !responseGet.headers["x-frame-options"],
                        url,
                    }
                } catch (error2: unknown) {
                    return processError(error2);
                }
            } else {
                return processError(error);
            }
        }
    }
}

export const embeddableService = new EmbeddableService();

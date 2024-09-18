import { isCardsPublicLink, isCardsConnectedLink, getCardsLink} from "./CardsService"
import { isEraserLink } from "./EraserService"
import { isExcalidrawLink } from "./ExcalidrawService"
import { getGoogleWorkSpaceEmbedUrl, isGoogleWorkSpaceLink } from "./GoogleWorkSpaceService"
import { getKlaxoonEmbedUrl, isKlaxoonLink } from "./KlaxoonService"
import { createEmbedlink, getYoutubeEmbedUrl, isYoutubeLink } from "./YoutubeService"

export const isApplicationLink = (url: URL) => {
    return isCardsPublicLink(url)
        || isCardsConnectedLink(url)
        || isEraserLink(url)
        || isExcalidrawLink(url)
        || isGoogleWorkSpaceLink(url)
        || isKlaxoonLink(url)
        || isYoutubeLink(url);
}

export const getApplicationEmbedLink = (url: URL) => {
    if (isCardsPublicLink(url) || isCardsConnectedLink(url)) {
        return getCardsLink(url);
    }
    if (isEraserLink(url)) {
        return url.toString();
    }
    if (isExcalidrawLink(url)) {
        return url.toString();
    }
    if (isGoogleWorkSpaceLink(url)) {
        return getGoogleWorkSpaceEmbedUrl(url);
    }
    if (isKlaxoonLink(url)) {
        return getKlaxoonEmbedUrl(url);
    }
    if (isYoutubeLink(url)) {
        return createEmbedlink(url);
    }
    return "";
}

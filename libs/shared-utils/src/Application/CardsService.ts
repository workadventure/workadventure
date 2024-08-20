import { CardsLinkException } from "./Exception/CardsException";

export const validateLink = (url: URL) => {
    if (isCardsLink(url)) return true;
    throw new CardsLinkException();
};

export const isCardsLink = (url: URL) => {
    return isCardsPublicLink(url) || isCardsConnectedLink(url);
};

export const getCardsLink = (url: URL, userToken?: string | null): string => {
    if (isCardsPublicLink(url)) {
        return url.toString();
    } else if (isCardsConnectedLink(url)) {
        if (userToken != undefined) url.searchParams.set("token", userToken);
        return url.toString();
    } else {
        throw new CardsLinkException();
    }
};

export const isCardsPublicLink = (url: URL) => {
    return ["app.cards-microlearning.com", "embed.cards-microlearning.com"].includes(url.hostname);
};

export const isCardsConnectedLink = (url: URL) => {
    return (
        ["member.workadventu.re", "member.staging.workadventu.re", "member.workadventure.localhost"].includes(
            url.hostname
        ) &&
        url.pathname.indexOf("cards") !== -1 &&
        url.searchParams.has("tenant") &&
        url.searchParams.has("training")
    );
};

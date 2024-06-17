import { CardsLinkException } from "./Exception/CardsException";

export const validateLink = (url: URL) => {
    if (isCardsLink(url)) return true;
    throw new CardsLinkException();
};

export const isCardsLink = (url: URL) => {
    return ["member.workadventu.re", "member.staging.workadventu.re", "member.workadventure.localhost"].includes(url.hostname) 
        && url.pathname === "/cards"
        && url.searchParams.has("tenant")
        && url.searchParams.has("learning");
};

export const getCardsLink = (url: URL, userToken?: string|null) : string => {
    if (!isCardsLink(url)) throw new CardsLinkException();
    if(userToken != undefined) url.searchParams.set("token", userToken);
    return url.toString();
};

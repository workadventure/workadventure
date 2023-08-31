import {LinkServiceInterface} from "./LinkServiceInterface";
import {RegexLinkService} from "./RegexLinkService";

export const applications: LinkServiceInterface[] = [
    new RegexLinkService(
        /https:\/\/docs.google.com\/document\/(.*)/,
        /https:\/\/docs.google.com\/document\/.*embedded=true.*/,
        "https://docs.google.com/document/$1"
    ),
]
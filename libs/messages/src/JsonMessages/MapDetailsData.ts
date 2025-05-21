import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import { isMetaTagFavicon } from "./MetaTagFavicon";
import { isMetaTagManifestIcon } from "./MetaTagManifestIcon";
import { OpidWokaNamePolicy } from "./OpidWokaNamePolicy";

const isBbbData = z.object({
    url: extendApi(z.string(), {
        description: 'The full URL to your BigBlueButton server. Do not forget the trailing "/bigbluebutton/".',
        example: "https://test-install.blindsidenetworks.com/bigbluebutton/",
    }),
    secret: extendApi(z.string(), {
        description:
            'The BigBlueButton secret. From your BBB instance, you can get the correct values using the command: "bbb-conf --secret"',
    }),
});

const isJitsiData = z.object({
    url: extendApi(z.string(), {
        description: "The domain name of your Jitsi server.",
        example: "meet.jit.si",
    }),
    iss: extendApi(z.string().nullable().optional(), {
        description: "The Jitsi ISS setting. See https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md",
        default: false,
    }),
    secret: extendApi(z.string().nullable().optional(), {
        description: "The Jitsi secret setting. See https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md",
    }),
});

const isMapThirdPartyData = z.object({
    bbb: extendApi(isBbbData.nullable().optional(), {
        description: "Use these settings to override default BigBlueButton settings.",
    }),
    jitsi: extendApi(isJitsiData.nullable().optional(), {
        description: "Use these settings to override default Jitsi settings.",
    }),
});

const MetaTagsData = z.object({
    // Meta tags values
    title: extendApi(z.string().optional().default("WorkAdventure"), {
        description: "Title shown on browser tab",
        example: "WorkAdventure - My Awesome World",
    }),
    description: extendApi(
        z.string().optional().default("Create your own digital office, Metaverse and meet online with the world."),
        {
            description: "Description of the webpage",
            example: "My awesome world in WorkAdventure",
        }
    ),
    author: extendApi(z.string().optional().default("WorkAdventure team"), {
        description: "Author of the webpage",
        example: "My Awesome team",
    }),
    provider: extendApi(z.string().optional().default("WorkAdventure"), {
        description: "Provider of the webpage",
        example: "WorkAdventure SAAS platform",
    }),
    favIcons: extendApi(isMetaTagFavicon.array().optional(), {
        description: "Icon to load inside the index.html and on the manifest",
    }),
    manifestIcons: isMetaTagManifestIcon.array().optional(),
    appName: extendApi(z.string().optional(), {
        description: "Name display on the PWA",
        example: "WorkAdventure",
    }),
    shortAppName: extendApi(z.string().optional(), {
        description: "PWA name when there not enough space",
        example: "WA",
    }),
    themeColor: extendApi(z.string().optional(), {
        description: "Color use for theme PWA icons, Windows app and android browser",
        example: "#000000",
    }),
    cardImage: extendApi(z.string().optional(), {
        description: "The URL of the image to be used on OG card tags",
        example: "https://example.com/awesome_world.png",
    }),
});

const RequiredMetaTagsData = MetaTagsData.required();

const isLegalsData = z.object({
    termsOfUseUrl: extendApi(z.string().nullable().optional(), {
        description: "The link to the 'terms of user' page (link displayed on the 'enter your name' scene)",
    }),
    privacyPolicyUrl: extendApi(z.string().nullable().optional(), {
        description: "The link to the 'privacy policy' page (link displayed on the 'enter your name' scene)",
    }),
    cookiePolicyUrl: extendApi(z.string().nullable().optional(), {
        description: "The link to the 'cookie policy' page (link displayed on the 'enter your name' scene)",
    }),
});

const CustomizeSceneData = z.object({
    clothesIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the clothes icon",
    }),
    accessoryIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the accessory icon",
    }),
    hatIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the hat icon",
    }),
    hairIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the hair icon",
    }),
    eyesIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the eyes icon",
    }),
    bodyIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the body icon",
    }),
    turnIcon: extendApi(z.string().nullable().optional(), {
        description: "The URL of the turn icon",
    }),
});

export const isMapDetailsData = z.object({
    mapUrl: extendApi(z.string().optional(), {
        description: "The full URL to the JSON map file",
        example: "https://myuser.github.io/myrepo/map.json",
    }),
    wamUrl: extendApi(z.string().url().optional(), {
        description: "The full URL to the WAM map file",
        example: "https://map-storage.myworkadventure.com/myrepo/map.wam",
    }),
    authenticationMandatory: extendApi(z.boolean().nullable().optional(), {
        description: "Whether the authentication is mandatory or not for this map",
        example: true,
    }),
    group: extendApi(z.string().nullable(), {
        description: 'The group this room is part of (maps the notion of "world" in WorkAdventure SAAS)',
        example: "myorg/myworld",
    }),
    contactPage: extendApi(z.string().nullable().optional(), {
        description: "The URL to the contact page",
        example: "https://mycompany.com/contact-us",
    }),
    opidLogoutRedirectUrl: extendApi(z.string().nullable().optional(), {
        description: "The URL of the logout redirect",
        example: "https://mycompany.com/logout",
    }),
    opidWokaNamePolicy: extendApi(OpidWokaNamePolicy.nullable().optional(), {
        description: "Username policy",
        example: "user_input",
    }),
    // The date (in ISO 8601 format) at which the room will expire
    expireOn: extendApi(z.optional(z.string()), {
        description: "The date (in ISO 8601 format) at which the room will expire",
        example: "2022-11-05T08:15:30-05:00",
    }),
    // Whether the "report" feature is enabled or not on this room
    canReport: extendApi(z.boolean().optional(), {
        description: 'Whether the "report" feature is enabled or not on this room',
        example: true,
    }),
    editable: extendApi(z.optional(z.boolean()), {
        description: 'Whether the "map editor" feature is enabled or not on this room (true if the map comes from the map-storage)',
        example: true,
    }),
    // The URL of the logo image on the loading screen
    loadingLogo: extendApi(z.string().nullable().optional(), {
        description: "The URL of the image to be used on the loading page",
        example: "https://example.com/logo.png",
    }),
    // The URL of the logo image on "LoginScene"
    loginSceneLogo: extendApi(z.string().nullable().optional(), {
        description: "The URL of the image to be used on the LoginScene",
        example: "https://example.com/logo_login.png",
    }),
    backgroundSceneImage: extendApi(z.string().nullable().optional(), {
        description: "The URL of the background image to be used on the loading page",
        example: "https://example.com/background.png",
    }),
    showPoweredBy: extendApi(z.boolean().nullable().optional(), {
        description: "Whether the logo PoweredBy is enabled or not on this room",
        example: true,
    }),
    thirdParty: extendApi(isMapThirdPartyData.nullable().optional(), {
        description: "Configuration data for third party services",
    }),
    metadata: extendApi(z.unknown().optional(), {
        description: "Metadata from administration",
    }),
    roomName: extendApi(z.string().nullable().optional(), {
        description: "The name of the current room.",
        example: "WA Village",
    }),
    pricingUrl: extendApi(z.string().nullable().optional(), {
        description:
            "The url of the page where the user can see the price to upgrade and can use the features he wants in the future.",
        example: "https://example.com/pricing",
    }),
    enableMatrixChat: extendApi(z.boolean().optional(), {
        description: "Whether the matrix chat is enabled or not on this room",
        example: true,
    }),
    enableChat: extendApi(z.boolean().optional(), {
        description: "Whether the chat is enabled or not on this room",
        example: true,
    }),
    enableChatUpload: extendApi(z.boolean().optional(), {
        description: "Whether the feature 'upload' in the chat is enabled or not on this room",
        example: true,
    }),
    enableChatOnlineList: extendApi(z.boolean().optional(), {
        description: "Whether the feature 'Users list' in the chat is enabled or not on this room",
        example: true,
    }),
    enableChatDisconnectedList: extendApi(z.boolean().optional(), {
        description: "Whether the feature 'disconnected users' in the chat is enabled or not on this room",
        example: true,
    }),
    enableSay: extendApi(z.boolean().optional(), {
        description: "Whether the users can communicate via 'comics-like' conversation bubbles.",
        example: true,
    }),
    metatags: extendApi(MetaTagsData.nullable().optional(), {
        description: "Data related to METATAGS / meta tags. Contains page title, favicons, og data, etc...",
    }),
    legals: extendApi(isLegalsData.nullable().optional(), {
        description: "Configuration of the legals link (privacy policy, etc...)",
    }),
    customizeWokaScene: extendApi(CustomizeSceneData.nullable().optional(), {
        description: "Configuration of the 'Customize your Woka' scene (WIP)",
    }),
    backgroundColor: extendApi(z.string().nullable().optional(), {
        description: "The background color used on configuration scenes (enter your name, select a woka, etc...) (WIP)",
        example: "#330033",
    }),
    primaryColor: extendApi(z.string().nullable().optional(), {
        description: "The primary color used on configuration scenes (enter your name, select a woka, etc...)",
        example: "#330033",
    }),
    reportIssuesUrl: extendApi(z.string().nullable().optional(), {
        description: "The URL of the page to report issues (in the 'Report issues' menu). If this parameter is null, report issues menu is hidden",
        example: "https://my-report-issues-form.com/issues",
    }),
    entityCollectionsUrls: extendApi(z.array(z.string()).optional().nullable(), {
        description: "What entity collections are available for this map",
    }),
    // The URL of the error image on "ErrorScene"
    errorSceneLogo: extendApi(z.string().nullable().optional(), {
        description: "The URL of the error image to be used on the ErrorScene",
        example: "https://example.com/error_logo_login.png",
    }),
    modules: extendApi(z.array(z.string()).optional().nullable(), {
        description: "List of external-modules to load",
    }),
    isLogged: extendApi(z.boolean().optional(), {
        description: "True if the UUID passed in parameter belongs to a legitimate user. Return false for anonymous users.",
    }),
});

export type MapDetailsData = z.infer<typeof isMapDetailsData>;
export type MapThirdPartyData = z.infer<typeof isMapThirdPartyData>;
export type MapBbbData = z.infer<typeof isBbbData>;
export type MapJitsiData = z.infer<typeof isJitsiData>;
export type MetaTagsData = z.infer<typeof MetaTagsData>;
export type RequiredMetaTagsData = z.infer<typeof RequiredMetaTagsData>;
export type LegalsData = z.infer<typeof isLegalsData>;
export type CustomizeSceneData = z.infer<typeof CustomizeSceneData>;

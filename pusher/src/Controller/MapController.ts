import { adminApi } from "../Services/AdminApi";
import { ADMIN_API_URL, DISABLE_ANONYMOUS } from "../Enum/EnvironmentVariable";
import { GameRoomPolicyTypes } from "../Model/PusherRoom";
import { isMapDetailsData, MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { AuthTokenData, jwtTokenManager } from "../Services/JWTTokenManager";
import { InvalidTokenError } from "./InvalidTokenError";
import { parse } from "query-string";
import { BaseHttpController } from "./BaseHttpController";

export class MapController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes() {
        /**
         * @openapi
         * /map:
         *   get:
         *     description: Returns a map mapping map name to file name of the map
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "playUri"
         *        in: "query"
         *        description: "The full URL of WorkAdventure to load this map"
         *        required: true
         *        type: "string"
         *      - name: "authToken"
         *        in: "query"
         *        description: "The authentication token"
         *        required: true
         *        type: "string"
         *     responses:
         *       200:
         *         description: The details of the map
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               required:
         *                 - mapUrl
         *                 - policy_type
         *                 - tags
         *                 - textures
         *                 - authenticationMandatory
         *                 - roomSlug
         *                 - contactPage
         *                 - group
         *               properties:
         *                 mapUrl:
         *                   type: string
         *                   description: The full URL to the JSON map file
         *                   example: https://myuser.github.io/myrepo/map.json
         *                 policy_type:
         *                   type: integer
         *                   description: ANONYMOUS_POLICY = 1, MEMBERS_ONLY_POLICY = 2, USE_TAGS_POLICY= 3
         *                   example: 1
         *                 tags:
         *                   type: array
         *                   description: The list of tags required to enter this room
         *                   items:
         *                     type: string
         *                     example: speaker
         *                 authenticationMandatory:
         *                   type: boolean|null
         *                   description: Whether the authentication is mandatory or not for this map.
         *                   example: true
         *                 roomSlug:
         *                   type: string
         *                   description: The slug of the room
         *                   deprecated: true
         *                   example: foo
         *                 contactPage:
         *                   type: string|null
         *                   description: The URL to the contact page
         *                   example: https://mycompany.com/contact-us
         *                 group:
         *                   type: string|null
         *                   description: The group this room is part of (maps the notion of "world" in WorkAdventure SAAS)
         *                   example: myorg/myworld
         *                 iframeAuthentication:
         *                   type: string|null
         *                   description: The URL of the authentication Iframe
         *                   example: https://mycompany.com/authc
         *                 expireOn:
         *                   type: string|undefined
         *                   description: The date (in ISO 8601 format) at which the room will expire
         *                   example: 2022-11-05T08:15:30-05:00
         *                 canReport:
         *                   type: boolean|undefined
         *                   description: Whether the "report" feature is enabled or not on this room
         *                   example: true
         *
         */
        this.app.get("/map", (req, res) => {
            const query = parse(req.path_query);
            if (typeof query.playUri !== "string") {
                console.error("Expected playUri parameter in /map endpoint");
                res.status(400);
                res.send("Expected playUri parameter");
                return;
            }

            // If no admin URL is set, let's react on '/_/[instance]/[map url]' URLs
            if (!ADMIN_API_URL) {
                const roomUrl = new URL(query.playUri);

                const match = /\/_\/[^/]+\/(.+)/.exec(roomUrl.pathname);
                if (!match) {
                    res.status(404);
                    res.json({});
                    return;
                }

                const mapUrl = roomUrl.protocol + "//" + match[1];

                res.json({
                    mapUrl,
                    policy_type: GameRoomPolicyTypes.ANONYMOUS_POLICY,
                    roomSlug: null, // Deprecated
                    group: null,
                    tags: [],
                    contactPage: null,
                    authenticationMandatory: DISABLE_ANONYMOUS,
                } as MapDetailsData);

                return;
            }

            (async () => {
                try {
                    let userId: string | undefined = undefined;
                    if (query.authToken != undefined) {
                        let authTokenData: AuthTokenData;
                        try {
                            authTokenData = jwtTokenManager.verifyJWTToken(query.authToken as string);
                            userId = authTokenData.identifier;
                        } catch (e) {
                            try {
                                // Decode token, in this case we don't need to create new token.
                                authTokenData = jwtTokenManager.verifyJWTToken(query.authToken as string, true);
                                userId = authTokenData.identifier;
                                console.info("JWT expire, but decoded", userId);
                            } catch (e) {
                                if (e instanceof InvalidTokenError) {
                                    // The token was not good, redirect user on login page
                                    res.status(401);
                                    res.send("Token decrypted error");
                                    return;
                                } else {
                                    this.castErrorToResponse(e, res);
                                    return;
                                }
                            }
                        }
                    }
                    const mapDetails = await adminApi.fetchMapDetails(query.playUri as string, userId);

                    if (isMapDetailsData(mapDetails) && DISABLE_ANONYMOUS) {
                        mapDetails.authenticationMandatory = true;
                    }

                    res.json(mapDetails);
                } catch (e) {
                    this.castErrorToResponse(e, res);
                }
            })();
        });
    }
}

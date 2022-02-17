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
                    textures: [],
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

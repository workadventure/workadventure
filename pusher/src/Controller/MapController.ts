import { DISABLE_ANONYMOUS } from "../Enum/EnvironmentVariable";
import { isMapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { BaseHttpController } from "./BaseHttpController";
import { adminService } from "../Services/AdminService";
import { InvalidTokenError } from "./InvalidTokenError";
import { validateQuery } from "../Services/QueryValidator";
import { z } from "zod";

export class MapController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
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
         *                 loadingLogo:
         *                   type: string
         *                   description: The URL of the image to be used on the loading page
         *                   example: https://example.com/logo.png
         *                 loginSceneLogo:
         *                   type: string
         *                   description: The URL of the image to be used on the LoginScene
         *                   example: https://example.com/logo_login.png
         *
         */
        this.app.get("/map", (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    playUri: z.string(),
                    authToken: z.string().optional(),
                })
            );
            if (query === undefined) {
                return;
            }

            (async (): Promise<void> => {
                try {
                    let mapDetails = await adminService.fetchMapDetails(
                        query.playUri,
                        query.authToken,
                        req.header("accept-language")
                    );

                    const mapDetailsParsed = isMapDetailsData.safeParse(mapDetails);
                    if (DISABLE_ANONYMOUS && mapDetailsParsed.success) {
                        mapDetails = mapDetailsParsed.data;
                        mapDetails.authenticationMandatory = true;
                    }

                    res.json(mapDetails);
                    return;
                } catch (e) {
                    if (e instanceof InvalidTokenError) {
                        console.warn("Invalid token received", e);
                        res.status(401);
                        res.send("The Token is invalid");
                        return;
                    } else {
                        this.castErrorToResponse(e, res);
                    }
                }
            })();
        });
    }
}

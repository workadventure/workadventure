import axios from "axios";
import type { AxiosResponse } from "axios";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../../enums/EnvironmentVariable";
import { VerifyDomainInterface } from "./VerifyDomainInterface";

export class AdminVerifyDomainService implements VerifyDomainInterface {
    verifyDomain(uri: string): Promise<boolean> {
        /**
         * @openapi
         * /api/domain/verify:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Validates a domain name as valid for the WorkAdventure install
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "uri"
         *        in: "query"
         *        description: "A URI whose domain will be validated"
         *        type: "string"
         *        required: true
         *        example: "https://play.workadventu.re"
         *     responses:
         *       204:
         *         description: The domain is valid
         *       403:
         *         description: The domain is invalid
         */
        return axios
            .get<unknown, AxiosResponse<unknown>>(`${ADMIN_API_URL}/api/domain/verify`, {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
                params: {
                    uri,
                },
            })
            .then((res) => {
                return true;
            })
            .catch((err) => {
                console.error(
                    `Invalid redirection URL. Domain provided is unknown. This might be a hacking attempt.`,
                    err
                );
                return false;
            });
    }
}

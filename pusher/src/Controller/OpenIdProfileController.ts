import { BaseController } from "./BaseController";
import { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { parse } from "query-string";
import { openIDClient } from "../Services/OpenIDClient";
import { AuthTokenData, jwtTokenManager } from "../Services/JWTTokenManager";
import { adminApi } from "../Services/AdminApi";
import { OPID_CLIENT_ISSUER } from "../Enum/EnvironmentVariable";
import { IntrospectionResponse } from "openid-client";

export class OpenIdProfileController extends BaseController {
    constructor(private App: TemplatedApp) {
        super();
        this.profileOpenId();
    }

    profileOpenId() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.get("/profile", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const { accessToken } = parse(req.getQuery());
            if (!accessToken) {
                throw Error("Access token expected cannot to be check on Hydra");
            }
            try {
                const resCheckTokenAuth = await openIDClient.checkTokenAuth(accessToken as string);
                if (!resCheckTokenAuth.email) {
                    throw new Error("Email was not found");
                }
                res.end(
                    this.buildHtml(
                        OPID_CLIENT_ISSUER,
                        resCheckTokenAuth.email as string,
                        resCheckTokenAuth.picture as string | undefined
                    )
                );
            } catch (error) {
                console.error("profileCallback => ERROR", error);
                this.errorToResponse(error, res);
            }
        });
    }

    buildHtml(domain: string, email: string, pictureUrl?: string) {
        return `
                <!DOCTYPE>
                <html>
                    <head>
                        <style>
                            *{
                                font-family: PixelFont-7, monospace;
                            }
                            body{
                                text-align: center;
                                color: white;
                            }
                            section{
                                margin: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <section>
                                <img src="${pictureUrl ? pictureUrl : "/images/profile"}"> 
                            </section>
                            <section>
                                Profile validated by domain: <span style="font-weight: bold">${domain}</span>
                            </section>    
                            <section>
                                Your email: <span style="font-weight: bold">${email}</span>   
                            </section>
                        </div>
                    </body>
                </html>
            `;
    }
}

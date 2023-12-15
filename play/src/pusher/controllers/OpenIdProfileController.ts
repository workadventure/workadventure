import { z } from "zod";
import { openIDClient } from "../services/OpenIDClient";
import { OPID_CLIENT_ISSUER } from "../enums/EnvironmentVariable";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

export class OpenIdProfileController extends BaseHttpController {
    routes(): void {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/profile", async (req, res) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    accessToken: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }

            const { accessToken } = query;

            const resCheckTokenAuth = await openIDClient.checkTokenAuth(accessToken);
            if (!resCheckTokenAuth.sub) {
                throw new Error("Email was not found");
            }
            const sub = resCheckTokenAuth.sub;
            res.atomic(() => {
                res.setHeader("Content-Type", "text/html");
                res.send(this.buildHtml(OPID_CLIENT_ISSUER, sub));
            });
            return;
        });
    }

    buildHtml(domain: string, email: string, pictureUrl?: string): string {
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
                                <img src="${pictureUrl ? pictureUrl : "/static/images/logo-WA-min.png"}">
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

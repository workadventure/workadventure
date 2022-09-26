import { openIDClient } from "../Services/OpenIDClient";
import { OPID_CLIENT_ISSUER } from "../Enum/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";
import { validateQuery } from "../Services/QueryValidator";
import { z } from "zod";

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

            try {
                const resCheckTokenAuth = await openIDClient.checkTokenAuth(accessToken);
                if (!resCheckTokenAuth.sub) {
                    throw new Error("Email was not found");
                }
                res.setHeader("Content-Type", "text/html");
                res.send(
                    this.buildHtml(
                        OPID_CLIENT_ISSUER,
                        resCheckTokenAuth.sub
                        /*resCheckTokenAuth.picture as string | undefined*/
                    )
                );
                return;
            } catch (error) {
                console.error("profileCallback => ERROR", error);
                this.castErrorToResponse(error, res);
            }
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

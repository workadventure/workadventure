/* eslint-disable @typescript-eslint/no-misused-promises */
import cookie from "cookie";
import fetch from "node-fetch";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { App } from "../Server/sifrr.server";

const clientId = process.env.WEBEX_CLIENT_ID ?? "";
const clientSecret = process.env.WEBEX_CLIENT_SECRET ?? "";
const redirectUri = process.env.WEBEX_REDIRECT_URI ?? "http://api.workadventure.localhost/webex/callback";
const scopes = "spark:all";
const state = "workadventure-webex";

const authorizeUrl =
    "https://api.ciscospark.com/v1/authorize?" +
    "client_id=" +
    clientId +
    "&response_type=code" +
    "&redirect_uri=" +
    encodeURIComponent(redirectUri) +
    "&scope=" +
    encodeURIComponent(scopes) +
    "&state=" +
    state;

type TokenResult = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in: number;
};

export class WebexController {
    constructor(private App: App) {
        if (!clientId || !clientSecret) {
            throw Error("WEBEX_CLIENT_ID or WEBEX_CLIENT_SECRET env variable not set.");
        }
        this.App.get("/webex/authorize", this.authorize);
        this.App.get("/webex/refresh", this.refresh);
        this.App.get("/webex/callback", this.callback);
        this.App.get("/webex/token", (res) => res.end());
    }

    authorize = (res: HttpResponse, req: HttpRequest) => {
        const jar = cookie.parse(req.getHeader("cookie"));

        if (jar.webex_refresh_token) {
            this.redirect(res, "/webex/refresh");
        } else {
            this.redirect(res, authorizeUrl);
        }
    };

    refresh = async (res: HttpResponse, req: HttpRequest) => {
        let aborted = false;
        res.onAborted(() => {
            aborted = true;
        });

        const jar = cookie.parse(req.getHeader("cookie"));

        if (!jar.webex_refresh_token) {
            this.error(res, "No refresh token found");
        }

        try {
            const tokenResult = await this.refreshAccessToken(jar.webex_refresh_token!);

            if (!aborted) {
                this.handleTokenResult(res, tokenResult);
            }
        } catch (err) {
            if (!aborted) {
                this.error(res, (err as Error)?.message ?? err);
            }
        }
    };

    callback = async (res: HttpResponse, req: HttpRequest) => {
        let aborted = false;
        res.onAborted(() => {
            aborted = true;
        });

        const query = new Map(
            req
                .getQuery()
                .split("&")
                .map((keyValue) => keyValue.split("=") as [string, string])
        );

        let error: string | undefined;

        if (query.has("error")) {
            error = query.get("error");
        } else if (query.get("state") !== state) {
            error = "Invalid state";
        } else if (!query.has("code")) {
            error = "No authorization code returned";
        }

        if (error) {
            this.error(res, error);
            return;
        }

        try {
            const tokenResult = await this.fetchAccessToken(query.get("code")!);

            if (!aborted) {
                this.handleTokenResult(res, tokenResult);
            }
        } catch (err) {
            if (!aborted) {
                this.error(res, (err as Error)?.message ?? err);
            }
        }
    };

    private error(res: HttpResponse, error: string) {
        res.writeStatus("500");
        res.end(error);
    }
    private redirect(res: HttpResponse, location: string, ...cookies: string[]) {
        res.writeStatus("302");
        cookies.forEach((cookie) => res.writeHeader("Set-Cookie", cookie));
        res.writeHeader("Location", location);
        res.end();
    }

    private redirectToToken(res: HttpResponse, args: { accessToken: string; expiresIn: number }, ...cookies: string[]) {
        this.redirect(
            res,
            "http://play.workadventure.localhost?" +
                Object.entries(args)
                    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                    .join("&"),
            ...cookies
        );
    }

    private handleTokenResult(res: HttpResponse, tokenResult: TokenResult) {
        this.redirectToToken(
            res,
            { accessToken: tokenResult.access_token, expiresIn: tokenResult.expires_in },
            // cookie.serialize("webex_access_token", tokenResult.access_token, {
            //     httpOnly: true,
            //     sameSite: "lax",
            //     maxAge: tokenResult.expires_in - 24 * 60 * 60,
            //     domain: "workadventure.localhost",
            //     path: "/",
            // }),
            cookie.serialize("webex_refresh_token", tokenResult.refresh_token, {
                httpOnly: true,
                sameSite: "lax",
                maxAge: tokenResult.refresh_token_expires_in,
                domain: "workadventure.localhost",
                path: "/",
            })
        );
    }

    private fetchAccessToken = async (authorizationCode: string): Promise<TokenResult> => {
        const form: { [key: string]: string } = {
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code: authorizationCode,
            redirect_uri: redirectUri,
        };

        const tokenResponse = await fetch("https://api.ciscospark.com/v1/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: Object.keys(form)
                .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(form[key]))
                .join("&"),
        });

        if (!tokenResponse.ok) {
            throw Error(await tokenResponse.text());
        }
        const result = await tokenResponse.json();

        console.log("token response", result);

        return result as {
            access_token: string;
            expires_in: number;
            refresh_token: string;
            refresh_token_expires_in: number;
        };
    };

    private refreshAccessToken = async (refreshToken: string): Promise<TokenResult> => {
        const form: { [key: string]: string } = {
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        };

        const tokenResponse = await fetch("https://api.ciscospark.com/v1/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: Object.keys(form)
                .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(form[key]))
                .join("&"),
        });

        if (!tokenResponse.ok) {
            throw Error(await tokenResponse.text());
        }
        const result = await tokenResponse.json();

        console.log("token response", result);

        return result;
    };
}

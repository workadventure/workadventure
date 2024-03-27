import crypto from "crypto";
import type { Client, IntrospectionResponse, OpenIDCallbackChecks } from "openid-client";
import { Issuer, generators } from "openid-client";
import { v4 } from "uuid";
import type { Request, Response } from "hyper-express";
import {
    OPID_CLIENT_ID,
    OPID_CLIENT_SECRET,
    OPID_CLIENT_ISSUER,
    OPID_CLIENT_REDIRECT_URL,
    OPID_USERNAME_CLAIM,
    OPID_LOCALE_CLAIM,
    OPID_SCOPE,
    OPID_PROMPT,
    SECRET_KEY,
} from "../enums/EnvironmentVariable";

class OpenIDClient {
    private issuerPromise: Promise<Client> | null = null;
    private secret: string;

    constructor() {
        this.secret = crypto.createHash("sha256").update(String(SECRET_KEY)).digest("base64").substring(0, 32);
    }

    private initClient(): Promise<Client> {
        if (!this.issuerPromise) {
            this.issuerPromise = Issuer.discover(OPID_CLIENT_ISSUER)
                .then((issuer) => {
                    return new issuer.Client({
                        client_id: OPID_CLIENT_ID,
                        client_secret: OPID_CLIENT_SECRET,
                        redirect_uris: [OPID_CLIENT_REDIRECT_URL],
                        response_types: ["code"],
                    });
                })
                .catch((e) => {
                    // If this fails, let's try with only the openid-configuration configuration.
                    console.info(
                        "Failed to fetch OIDC configuration for both .well-known/openid-configuration and oauth-authorization-server. Trying .well-known/openid-configuration only."
                    );
                    this.issuerPromise = Issuer.discover(OPID_CLIENT_ISSUER + "/.well-known/openid-configuration")
                        .then((issuer) => {
                            return new issuer.Client({
                                client_id: OPID_CLIENT_ID,
                                client_secret: OPID_CLIENT_SECRET,
                                redirect_uris: [OPID_CLIENT_REDIRECT_URL],
                                response_types: ["code"],
                            });
                        })
                        .catch((e) => {
                            this.issuerPromise = null;
                            throw e;
                        });
                    return this.issuerPromise;
                });
        }
        return this.issuerPromise;
    }

    public authorizationUrl(
        res: Response,
        redirect: string | undefined,
        playUri: string,
        req: Request
    ): Promise<string> {
        return this.initClient().then((client) => {
            if (!OPID_SCOPE.includes("email") || !OPID_SCOPE.includes("openid")) {
                throw new Error("Invalid scope, 'email' and 'openid' are required in OPID_SCOPE.");
            }

            const code_verifier = generators.codeVerifier();
            // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
            // it should be httpOnly (not readable by javascript) and encrypted.
            res.cookie("code_verifier", this.encrypt(code_verifier), undefined, {
                httpOnly: true, // dont let browser javascript access cookie ever
                secure: req.secure, // only use cookie over https
            });

            // We also store the state in cookies. The state should not be needed, except for older OpenID client servers that
            // don't understand PKCE
            const state = v4();
            res.cookie("oidc_state", state, undefined, {
                httpOnly: true, // dont let browser javascript access cookie ever
                secure: req.secure, // only use cookie over https
            });

            const code_challenge = generators.codeChallenge(code_verifier);

            return client.authorizationUrl({
                scope: OPID_SCOPE,
                prompt: OPID_PROMPT,
                state: state,
                //nonce: nonce,
                playUri,
                redirect: redirect,

                code_challenge,
                code_challenge_method: "S256",
            });
        });
    }

    public getUserInfo(
        req: Request,
        res: Response
    ): Promise<{ email: string; sub: string; access_token: string; username: string; locale: string }> {
        const fullUrl = req.url;
        const cookies = req.cookies;

        if (typeof cookies?.code_verifier !== "string") {
            throw new Error("code verifier doesn't exist");
        }

        const code_verifier = this.decrypt(cookies.code_verifier);
        const state = cookies.oidc_state;

        return this.initClient().then((client) => {
            const params = client.callbackParams(fullUrl);

            const checks: OpenIDCallbackChecks = {
                code_verifier,
            };

            if (state && params.state && typeof state === "string") {
                checks.state = state;
            }

            return client.callback(OPID_CLIENT_REDIRECT_URL, params, checks).then((tokenSet) => {
                res.clearCookie("code_verifier");
                res.clearCookie("oidc_state");

                return client.userinfo(tokenSet).then((res) => {
                    return {
                        ...res,
                        email: res.email ?? "",
                        sub: res.sub,
                        access_token: tokenSet.access_token ?? "",
                        username: res[OPID_USERNAME_CLAIM] as string,
                        locale: res[OPID_LOCALE_CLAIM] as string,
                    };
                });
            });
        });
    }

    public logoutUser(token: string): Promise<void> {
        return this.initClient().then((client) => {
            if (!client.metadata.revocation_endpoint) {
                return;
            }
            return client.revoke(token);
        });
    }

    public checkTokenAuth(token: string): Promise<IntrospectionResponse> {
        return this.initClient().then((client) => {
            return client.userinfo(token);
        });
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.secret), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString("hex") + "::" + encrypted.toString("hex");
    }

    private decrypt(data: string): string {
        const parts = data.split("::");
        if (parts.length !== 2) {
            throw new Error("Unexpected encrypted data: " + data);
        }
        const ivStr = parts[0];
        const encryptedData = parts[1];
        const iv = Buffer.from(ivStr, "hex");
        const encryptedText = Buffer.from(encryptedData, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.secret), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

export const openIDClient = new OpenIDClient();

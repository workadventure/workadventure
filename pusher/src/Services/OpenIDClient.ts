import { Issuer, Client, IntrospectionResponse } from "openid-client";
import {
    OPID_CLIENT_ID,
    OPID_CLIENT_SECRET,
    OPID_CLIENT_ISSUER,
    OPID_CLIENT_REDIRECT_URL,
} from "../Enum/EnvironmentVariable";

class OpenIDClient {
    private issuerPromise: Promise<Client> | null = null;

    private initClient(): Promise<Client> {
        if (!this.issuerPromise) {
            this.issuerPromise = Issuer.discover(OPID_CLIENT_ISSUER).then((issuer) => {
                return new issuer.Client({
                    client_id: OPID_CLIENT_ID,
                    client_secret: OPID_CLIENT_SECRET,
                    redirect_uris: [OPID_CLIENT_REDIRECT_URL],
                    response_types: ["code"],
                });
            });
        }
        return this.issuerPromise;
    }

    public authorizationUrl(state: string, nonce: string, playUri?: string, redirect?: string) {
        return this.initClient().then((client) => {
            return client.authorizationUrl({
                scope: "openid email",
                prompt: "login",
                state: state,
                nonce: nonce,
                playUri: playUri,
                redirect: redirect,
            });
        });
    }

    public getUserInfo(code: string, nonce: string): Promise<{ email: string; sub: string; access_token: string }> {
        return this.initClient().then((client) => {
            return client.callback(OPID_CLIENT_REDIRECT_URL, { code }, { nonce }).then((tokenSet) => {
                return client.userinfo(tokenSet).then((res) => {
                    return {
                        ...res,
                        email: res.email as string,
                        sub: res.sub,
                        access_token: tokenSet.access_token as string,
                    };
                });
            });
        });
    }

    public logoutUser(token: string): Promise<void> {
        return this.initClient().then((client) => {
            return client.revoke(token);
        });
    }

    public checkTokenAuth(token: string): Promise<IntrospectionResponse> {
        return this.initClient().then((client) => {
            return client.userinfo(token);
        });
    }
}

export const openIDClient = new OpenIDClient();

import { Issuer, Client, IntrospectionResponse } from "openid-client";
import {
    OPID_CLIENT_ID,
    OPID_CLIENT_SECRET,
    OPID_CLIENT_ISSUER,
    OPID_CLIENT_REDIRECT_URL,
    OPID_USERNAME_CLAIM,
    OPID_LOCALE_CLAIM,
    OPID_SCOPE,
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
            if( OPID_SCOPE == undefined || OPID_SCOPE.indexOf('email') === -1 || OPID_SCOPE.indexOf('openid') === -1 ) {
                throw new Error("Invalid scope, 'email' and 'openid' are required in OPID_SCOPE.");
              }
            return client.authorizationUrl({
                scope: OPID_SCOPE,
                prompt: "login",
                state: state,
                nonce: nonce,
                playUri: playUri,
                redirect: redirect,
            });
        });
    }

    public getUserInfo(
        code: string,
        nonce: string
    ): Promise<{ email: string; sub: string; access_token: string; username: string; locale: string }> {
        return this.initClient().then((client) => {
            return client.callback(OPID_CLIENT_REDIRECT_URL, { code }, { nonce }).then((tokenSet) => {
                return client.userinfo(tokenSet).then((res) => {
                    return {
                        ...res,
                        email: res.email as string,
                        sub: res.sub,
                        access_token: tokenSet.access_token as string,
                        username: res[OPID_USERNAME_CLAIM] as string,
                        locale: res[OPID_LOCALE_CLAIM] as string,
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

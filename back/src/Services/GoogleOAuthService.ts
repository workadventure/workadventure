import { Request } from "express";
import { Session } from "express-session";
import { Tokens } from "googleapis-common";
import { OAuth2Client } from "google-auth-library";
import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from "../Enum/EnvironmentVariable";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface GoogleOAuthSession extends Session {
    googleOAuthState?: string;
    googleOAuthTokens?: Tokens;
}

export function getSession(request: Request): GoogleOAuthSession {
    return request.session as GoogleOAuthSession;
}

export function getOAuth2Client(): OAuth2Client {
    return new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
}

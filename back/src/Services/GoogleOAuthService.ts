import { Request } from "express";
import { Session } from "express-session";
import { Tokens } from "googleapis-common";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface GoogleOAuthSession extends Session {
    googleOAuthState?: string;
    googleOAuthTokens?: Tokens;
}

export function getSession(request: Request): GoogleOAuthSession {
    return request.session as GoogleOAuthSession;
}

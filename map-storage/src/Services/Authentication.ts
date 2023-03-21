import { Strategy as BearerStrategy } from "passport-http-bearer";
import { BasicStrategy, DigestStrategy } from "passport-http";
import passport, { Authenticator, Strategy } from "passport";
import { RequestHandler } from "express";
import { ENV_VARS } from "../Enum/EnvironmentVariable";

let strategy: Strategy;
let authenticator: ReturnType<Authenticator["authenticate"]>;

switch (ENV_VARS.AUTHENTICATION_STRATEGY) {
    case "Bearer": {
        const authToken = ENV_VARS.AUTHENTICATION_TOKEN;
        strategy = new BearerStrategy((token, done) => {
            if (token !== authToken) {
                return done(null, false);
            } else {
                return done(null, {}, { scope: "all" });
            }
        });
        //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        authenticator = passport.authenticate("bearer", { session: false });
        break;
    }
    case "Basic": {
        const configuredUser = ENV_VARS.AUTHENTICATION_USER;
        const configuredPassword = ENV_VARS.AUTHENTICATION_PASSWORD;
        strategy = new BasicStrategy((userid, password, done) => {
            if (userid !== configuredUser || password !== configuredPassword) {
                return done(null, false);
            } else {
                return done(null, {
                    name: userid,
                });
            }
        });
        //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        authenticator = passport.authenticate("basic", { session: false });
        break;
    }
    case "Digest": {
        const configuredUser = ENV_VARS.AUTHENTICATION_USER;
        const configuredPassword = ENV_VARS.AUTHENTICATION_PASSWORD;
        strategy = new DigestStrategy((userid, done) => {
            if (userid !== configuredUser) {
                return done(null, false);
            } else {
                return done(
                    null,
                    {
                        name: userid,
                    },
                    configuredPassword
                );
            }
        });
        //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        authenticator = passport.authenticate("digest", { session: false });
        break;
    }
    default: {
        const _exhaustiveCheck: never = ENV_VARS;
        throw new Error("Missing AUTHENTICATION_STRATEGY");
    }
}

export const passportStrategy = strategy;
export const passportAuthenticator = authenticator as RequestHandler;

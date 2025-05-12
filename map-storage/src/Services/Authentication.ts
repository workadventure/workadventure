import { Strategy as BearerStrategy, VerifyFunctionWithRequest } from "passport-http-bearer";
import { BasicStrategy, DigestStrategy } from "passport-http";
import passport, { Strategy } from "passport";
import { RequestHandler } from "express";
import { setupCache } from "axios-cache-interceptor";
import axios from "axios";
import { ENV_VARS } from "../Enum/EnvironmentVariable";

const client = setupCache(axios);

const strategies: Strategy[] = [];
const authenticators: string[] = [];

if (ENV_VARS.AUTHENTICATION_STRATEGY) {
    console.warn(
        `[${new Date().toISOString()}] The AUTHENTICATION_STRATEGY environment variable is deprecated. Use ENABLE_BEARER_AUTHENTICATION, ENABLE_BASIC_AUTHENTICATION or ENABLE_DIGEST_AUTHENTICATION instead`
    );
    switch (ENV_VARS.AUTHENTICATION_STRATEGY) {
        case "Bearer":
            ENV_VARS.ENABLE_BEARER_AUTHENTICATION = true;
            break;
        case "Basic":
            ENV_VARS.ENABLE_BASIC_AUTHENTICATION = true;
            break;
        case "Digest":
            ENV_VARS.ENABLE_DIGEST_AUTHENTICATION = true;
            break;
        case "":
            break;
        default: {
            throw new Error(
                "Invalid AUTHENTICATION_STRATEGY environment variable, must be Bearer, Basic, Digest or empty"
            );
        }
    }
}

if (ENV_VARS.ENABLE_BEARER_AUTHENTICATION) {
    if (!ENV_VARS.AUTHENTICATION_TOKEN && !ENV_VARS.AUTHENTICATION_VALIDATOR_URL) {
        throw new Error("Missing AUTHENTICATION_TOKEN or AUTHENTICATION_VALIDATOR_URL environment variables");
    }
    const authToken = ENV_VARS.AUTHENTICATION_TOKEN;
    const verify: VerifyFunctionWithRequest = (
        request,
        token: string,
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        done: (error: any, user?: any, options?: any) => void
    ) => {
        console.log(`[${new Date().toISOString()}] Bearer authentication received:`, token);
        if (authToken && token === authToken) {
            return done(null, {}, { scope: "all" });
        }
        const domain = request.headers["x-forwarded-host"]?.toString() ?? request.hostname;
        if (ENV_VARS.AUTHENTICATION_VALIDATOR_URL) {
            client
                .get<unknown>(ENV_VARS.AUTHENTICATION_VALIDATOR_URL, {
                    cache: process.env.NODE_ENV === "production" ? undefined : false,
                    id: `domain-authorization-${domain}-${token}`,
                    headers: {
                        "X-API-Key": token,
                    },
                    params: {
                        domain,
                    },
                })
                .then((rawResponse) => {
                    return done(null, {}, { scope: "all" });
                })
                .catch((error) => {
                    return done(null, false);
                });

            return;
        }
        return done(null, false);
    };
    strategies.push(new BearerStrategy({ passReqToCallback: true }, verify));
    authenticators.push("bearer");
}

if (ENV_VARS.ENABLE_BASIC_AUTHENTICATION) {
    const configuredUser = ENV_VARS.AUTHENTICATION_USER;
    const configuredPassword = ENV_VARS.AUTHENTICATION_PASSWORD;
    if (!configuredUser) {
        throw new Error("Missing AUTHENTICATION_USER environment variable");
    }
    if (!configuredPassword) {
        throw new Error("Missing AUTHENTICATION_PASSWORD environment variable");
    }
    strategies.push(
        new BasicStrategy((userid, password, done) => {
            if (userid !== configuredUser || password !== configuredPassword) {
                return done(null, false);
            } else {
                return done(null, {
                    name: userid,
                });
            }
        })
    );
    authenticators.push("basic");
}

if (ENV_VARS.ENABLE_DIGEST_AUTHENTICATION) {
    const configuredUser = ENV_VARS.AUTHENTICATION_USER;
    const configuredPassword = ENV_VARS.AUTHENTICATION_PASSWORD;
    if (!configuredUser) {
        throw new Error("Missing AUTHENTICATION_USER environment variable");
    }
    if (!configuredPassword) {
        throw new Error("Missing AUTHENTICATION_PASSWORD environment variable");
    }
    strategies.push(
        new DigestStrategy((userid, done) => {
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
        })
    );
    authenticators.push("digest");
}

//eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const authenticator = passport.authenticate(authenticators, { session: false });
export const passportStrategies = strategies;
export const passportAuthenticator = authenticator as RequestHandler;

import type { VerifyFunctionWithRequest } from "passport-http-bearer";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { BasicStrategy, DigestStrategy } from "passport-http";
import type { Strategy } from "passport";
import passport from "passport";
import type { RequestHandler } from "express";
import { fetch } from "@workadventure/shared-utils/src/Fetch/nodeFetch";
import { ENV_VARS } from "../Enum/EnvironmentVariable";

const AUTH_VALIDATION_CACHE_TTL_MS = 60_000;
const authValidationCache = new Map<string, number>();
const authValidationRequests = new Map<string, Promise<void>>();

async function validateDomainAuthorization(domain: string, token: string): Promise<void> {
    const validatorUrl = ENV_VARS.AUTHENTICATION_VALIDATOR_URL;
    if (!validatorUrl) {
        throw new Error("Missing AUTHENTICATION_VALIDATOR_URL environment variable");
    }

    const cacheKey = `domain-authorization-${domain}-${token}`;

    if (process.env.NODE_ENV === "production") {
        const expiresAt = authValidationCache.get(cacheKey);
        if (expiresAt && expiresAt > Date.now()) {
            return;
        }
    }

    const ongoingValidation = authValidationRequests.get(cacheKey);
    if (ongoingValidation) {
        return ongoingValidation;
    }

    const validationPromise = (async () => {
        const url = new URL(validatorUrl);
        url.searchParams.set("domain", domain);

        await fetch(url, {
            headers: {
                "X-API-Key": token,
            },
        });

        if (process.env.NODE_ENV === "production") {
            authValidationCache.set(cacheKey, Date.now() + AUTH_VALIDATION_CACHE_TTL_MS);
        }
    })().finally(() => {
        authValidationRequests.delete(cacheKey);
    });

    authValidationRequests.set(cacheKey, validationPromise);
    return validationPromise;
}

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
        console.info(`[${new Date().toISOString()}] Bearer authentication received:`, token);
        if (authToken && token === authToken) {
            return done(null, {}, { scope: "all" });
        }
        const domain = request.headers["x-forwarded-host"]?.toString() ?? request.hostname;
        if (ENV_VARS.AUTHENTICATION_VALIDATOR_URL) {
            validateDomainAuthorization(domain, token)
                .then(() => {
                    return done(null, {}, { scope: "all" });
                })
                .catch(() => {
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

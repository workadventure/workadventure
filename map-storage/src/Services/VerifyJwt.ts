import fs from "node:fs/promises";
import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import z from "zod";
import type { AreaData } from "@workadventure/map-editor";
import { WAMFileFormat } from "@workadventure/map-editor";
import { fileSystem } from "../fileSystem.ts";
import { PATH_PREFIX, SECRET_KEY } from "../Enum/EnvironmentVariable.ts";
import { mapPathUsingDomainWithPrefix } from "./PathMapper.ts";

const AuthTokenData = z.object({
    wamUrl: z.string().url(),
    tags: z.array(z.string()).optional(),
});
type AuthTokenData = z.infer<typeof AuthTokenData>;

const errorFileUrl = new URL("../../src-ui/error.html", import.meta.url);

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
    let token: string | null = null;

    if (typeof req.query.token === "string") {
        token = req.query.token;
    } else {
        console.error("Invalid token format in query parameters");
        return await sendHtmlError(res, "Forbidden", 403);
    }

    try {
        const secret = new TextEncoder().encode(SECRET_KEY ?? "");
        const decoded = (await jwtVerify(token, secret)).payload;

        const parsed = AuthTokenData.parse(decoded);
        let pathPrefix = PATH_PREFIX ?? "";
        if (!pathPrefix.endsWith("/")) {
            pathPrefix += "/";
        }

        const forwardedHostHeader = req.headers["x-forwarded-host"];
        const host =
            (Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader) ?? req.get("host");

        const url = new URL(
            req.url.split("?")[0].substring(1),
            new URL(pathPrefix, req.protocol + "://" + host)
        ).toString();

        await verifyWam(parsed, url);

        return next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("Invalid Jwt format zodError", err.errors);
            return await sendHtmlError(res, "Invalid JWT format", 400);
        }
        console.error("Forbidden", err);
        return await sendHtmlError(res, "Forbidden", 403);
    }
}

async function verifyWam(jwt: AuthTokenData, url: string): Promise<void> {
    const parsedUrl = new URL(jwt.wamUrl);
    const mapPath = mapPathUsingDomainWithPrefix(parsedUrl.pathname, parsedUrl.hostname);

    const test = await getAndCheckWamFile(mapPath, url);

    if (test === "entity") {
        return;
    }

    const restrictionProperty = test.properties?.find((prop) => prop.type === "restrictedRightsPropertyData");

    if (!restrictionProperty) {
        return; // No restrictions, access granted
    } else {
        const allowedTags = (restrictionProperty as { readTags?: string[] }).readTags;

        if (!allowedTags || allowedTags.length === 0) {
            return; // No tags specified, access granted
        }

        const hasAccess = jwt.tags?.some((tag) => allowedTags.includes(tag));

        if (!hasAccess) {
            throw new Error(`Access denied: JWT tags do not match the required tags for the area.`);
        }

        return; // Access granted
    }
}

async function sendHtmlError(res: Response, message: string, statusCode: number = 403) {
    try {
        let html = await fs.readFile(errorFileUrl, "utf-8");
        html = html.replace("{{errorMessage}}", message);
        res.status(statusCode).send(html);
    } catch (err) {
        console.error("Error reading or sending HTML file:", err);
        res.status(500).send("Internal Server Error");
    }
}

// Wam File Verification Function
// Wam is updated every 15 seconds so we need to set a timeout to check the file if we don't find the area or entity
async function getAndCheckWamFile(mapPath: string, url: string): Promise<AreaData | "entity"> {
    const INTERVAL = 2000;
    const TIMEOUT = 16000;
    const deadline = Date.now() + TIMEOUT;
    const decodedUrl = decodeURI(url);

    const matchesUrl = (p: { type: string; link?: string | null }) =>
        p.type === "openFile" && decodeURI(p.link ?? "") === decodedUrl;

    while (Date.now() < deadline) {
        // eslint-disable-next-line no-await-in-loop
        const wamString = await fileSystem.readFileAsString(mapPath);
        const wam = WAMFileFormat.parse(JSON.parse(wamString));

        const area = wam.areas.find((a) => a.properties.some(matchesUrl));
        if (area) return area;

        const entity = Object.values(wam.entities).find((e) => e.properties?.some(matchesUrl));
        if (entity) return "entity";

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
            setTimeout(resolve, INTERVAL);
        });
    }

    throw new Error(`No area or entity found with a matching file: ${url}`);
}

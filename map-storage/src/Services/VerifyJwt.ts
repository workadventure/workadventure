import path from "path";
import fs from "fs/promises";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import { fileSystem } from "../fileSystem";
import { SECRET_KEY } from "../Enum/EnvironmentVariable";
import { mapPathUsingDomain } from "./PathMapper";

const AuthTokenData = z.object({
    wamUrl: z.string().url(),
    tags: z.array(z.string()).optional(),
});
type AuthTokenData = z.infer<typeof AuthTokenData>;

export async function verifyJWT(req: Request, res: Response, next: NextFunction) {
    if (!req.url.includes("/file/")) return next();

    let token: string | null = null;

    if (typeof req.query.token === "string") {
        token = req.query.token;
    } else {
        console.error("Invalid token format in query parameters");
        return await sendHtmlError(res, "Forbidden", 403);
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY ?? "");
        const parsed = AuthTokenData.parse(decoded);
        const url = req.protocol + "://" + req.get("host") + req.url.split("?")[0];

        await verifyWam(parsed, url);

        // eslint-disable-next-line require-atomic-updates
        req.url = url;
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
    console.log("Verifying WAM URL:", jwt.wamUrl);
    const parsedUrl = new URL(jwt.wamUrl);
    const mapPath = mapPathUsingDomain(parsedUrl.pathname, parsedUrl.hostname);

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
    const errorFilePath = path.join(__dirname, "../../src-ui/error.html");

    try {
        let html = await fs.readFile(errorFilePath, "utf-8");
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

    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                const wamString = await fileSystem.readFileAsString(mapPath);
                const wam = WAMFileFormat.parse(JSON.parse(wamString));

                const area = wam.areas.find((a) =>
                    a.properties.some((p) => p.type === "openPdf" && decodeURI(p.link ?? "") === decodeURI(url))
                );

                const entity = Object.values(wam.entities).find((e) =>
                    e.properties?.some((p) => p.type === "openPdf" && decodeURI(p.link ?? "") === decodeURI(url))
                );

                if (area) {
                    clearInterval(interval);
                    resolve(area);
                } else if (entity) {
                    clearInterval(interval);
                    console.log("Found entity with PDF link matching:", url, entity);
                    resolve("entity");
                } else if (Date.now() >= deadline) {
                    clearInterval(interval);
                    reject(new Error(`No area or entity found with a PDF link matching: ${url}`));
                }
            } catch (err) {
                clearInterval(interval);
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        };

        const interval = setInterval(() => {
            void poll();
        }, INTERVAL);

        void poll();
    });
}

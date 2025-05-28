import path from "path";
import fs from "fs/promises";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import { WAMFileFormat } from "@workadventure/map-editor";
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

    const wamFileString = await fileSystem.readFileAsString(mapPath);
    const wam = WAMFileFormat.parse(JSON.parse(wamFileString));

    const area = wam.areas.find((area) =>
        area.properties.some((prop) => prop.type === "openPdf" && decodeURI(prop.link ?? "") === decodeURI(url))
    );

    const entity = Object.values(wam.entities).find((value) =>
        value.properties?.some((prop) => prop.type === "openPdf" && decodeURI(prop.link ?? "") === decodeURI(url))
    );

    if (!area && !entity) {
        throw new Error(`No area or entity found with a PDF link matching the URL: ${url}`);
    }

    let restrictionProperty;

    if (area) {
        restrictionProperty = area.properties.find((prop) => prop.type === "restrictedRightsPropertyData");
    }
    /* Add this if resticted rights are added to entities
    else if (entity) {
        restrictionProperty = entity.properties?.find((prop) => prop.type === "restrictedRightsPropertyData");
    } */

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

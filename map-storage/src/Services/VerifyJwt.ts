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

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
    if (!req.url.includes("/file/")) return next(); // Skip JWT verification for non-file requests

    let token: string | null = null;

    if (typeof req.query.token === "string") {
        token = req.query.token;
    } else {
        return res.status(401).json({ message: "Missing token" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY ?? "");
        const parsed = AuthTokenData.parse(decoded);
        const url = req.protocol + "://" + req.get("host") + req.url.split("?")[0];

        verifyWam(parsed, url).catch((err) => {
            console.error("Error verifying JWT:", err);
            return res
                .status(403)
                .json({ message: "Forbidden", error: err instanceof Error ? err.message : String(err) });
        });

        req.url = url;
        return next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(403).json({ message: "Invalid token", details: err.errors });
        }
        return res.status(403).json({ message: "Forbidden" });
    }
}

async function verifyWam(jwt: AuthTokenData, url: string): Promise<void> {
    console.log("Verifying WAM URL:", jwt.wamUrl);
    const parsedUrl = new URL(jwt.wamUrl);
    const mapPath = mapPathUsingDomain(parsedUrl.pathname, parsedUrl.hostname); // je sais pas si le domain name c'est bien ca

    const wamFileString = await fileSystem.readFileAsString(mapPath);
    const wam = WAMFileFormat.parse(JSON.parse(wamFileString));

    const area = wam.areas.find((area) =>
        area.properties.some((prop) => prop.type === "openPdf" && decodeURI(prop.link ?? "") === decodeURI(url))
    );

    if (!area) {
        throw new Error(`No area found with a PDF link matching the URL: ${url}`);
    }

    const restrictionProperty = area.properties.find((prop) => prop.type === "restrictedRightsPropertyData");

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

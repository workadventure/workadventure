import { Express, Request, Response } from "express";
import { google } from "googleapis";
import { getSession } from "../Services/GoogleOAuthService";

const OAUTH2_CLIENT_ID = process.env.GOOGLE_OAUTH2_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
const OAUTH2_REDIRECT_URI = process.env.GOOGLE_OAUTH2_REDIRECT_URI;

export class GoogleOAuthController {
    constructor(private app: Express) {
        this.googleAuth();
        this.googleAuthCallback();
    }

    private googleAuth() {
        this.app.get("/auth/google", async (request: Request, response: Response) => {
            const session = getSession(request);

            const oauth2Client = new google.auth.OAuth2(
                OAUTH2_CLIENT_ID,
                OAUTH2_CLIENT_SECRET,
                OAUTH2_REDIRECT_URI
            );

            const scopes = [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/userinfo.profile",
            ];

            const url = oauth2Client.generateAuthUrl({
                access_type: "offline",
                scope: scopes,
            });

            session.googleOAuthState = oauth2Client.generateAuthUrl({
                access_type: "offline",
                scope: scopes,
            });
            await new Promise<void>((resolve, reject) => {
                session.save((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            response.redirect(url);
        });
    }

    private googleAuthCallback() {
        this.app.get("/auth/google/callback", async (request: Request, response: Response) => {
            const session = getSession(request);
            const { code } = request.query;

            if (!code) {
                response.status(400).send("Missing authorization code");
                return;
            }

            const oauth2Client = new google.auth.OAuth2(
                OAUTH2_CLIENT_ID,
                OAUTH2_CLIENT_SECRET,
                OAUTH2_REDIRECT_URI
            );

            try {
                const { tokens } = await oauth2Client.getToken(code as string);
                session.googleOAuthTokens = tokens;
                await new Promise<void>((resolve, reject) => {
                    session.save((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                response.send("<script>window.close();</script>");
            } catch (error) {
                console.error("Error retrieving access token", error);
                response.status(500).send("Error retrieving access token");
            }
        });
    }
}

import { Express, Request, Response } from "express";
import { getOAuth2Client, getSession } from "../Services/GoogleOAuthService";
import * as GoogleOAuthService from "../Services/GoogleOAuthService";
import * as MockGoogleOAuthService from "../Services/Mock/GoogleOAuthService";

export class GoogleOAuthController {
    constructor(private app: Express, private googleOAuthService: typeof GoogleOAuthService | typeof MockGoogleOAuthService) {
        this.googleAuth();
        this.googleAuthCallback();
    }

    private googleAuth() {
        this.app.get("/auth/google", async (request: Request, response: Response) => {
            const session = this.googleOAuthService.getSession(request);

            const oauth2Client = this.googleOAuthService.getOAuth2Client();

            const scopes = [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/contacts",
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
            const session = this.googleOAuthService.getSession(request);
            const { code } = request.query;

            if (!code) {
                response.status(400).send("Missing authorization code");
                return;
            }

            const oauth2Client = this.googleOAuthService.getOAuth2Client();

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

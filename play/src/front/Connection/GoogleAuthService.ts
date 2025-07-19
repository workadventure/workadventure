/* eslint-disable no-console */

import { GoogleTokenResponse, PingPong } from "@workadventure/messages";
import { BehaviorSubject } from "rxjs";
import { chat } from "../Chat/chat";

class GoogleAuthService {
    private readonly GOOGLE_AUTH_POPUP_NAME = "google-auth-popup";

    public readonly googleAuthenticationStatus = new BehaviorSubject<boolean>(false);

    private pingPong: PingPong | undefined;

    public start() {
        chat.subscribeTo("google_token", (message: unknown) => {
            console.log("GoogleAuthService => message", message);
        });
    }

    public init(pingPong: PingPong) {
        this.pingPong = pingPong;
    }

    public login() {
        const url = new URL(window.location.href);
        url.pathname = "/auth/google";
        const newWindow = window.open(url.toString(), this.GOOGLE_AUTH_POPUP_NAME);
        if (!newWindow) {
            console.error("Could not open Google authentication window");
            return;
        }

        const interval = setInterval(() => {
            if (newWindow.closed) {
                clearInterval(interval);
                this.pingPong?.send(
                    "google_token_response",
                    new GoogleTokenResponse({
                        token: "",
                    })
                );
                // TODO WAConnection.sendGoogleToken(this.GOOGLE_AUTH_POPUP_NAME);
            }
        }, 1000);
    }
}

export const googleAuthService = new GoogleAuthService();

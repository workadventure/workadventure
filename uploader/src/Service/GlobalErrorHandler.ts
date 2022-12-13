import type { Request, Response } from "hyper-express";
import axios from "axios";
import { DEBUG_ERROR_MESSAGES } from "../Enum/EnvironmentVariable";

export function globalErrorHandler(request: Request, response: Response, error: unknown) {
    if (error instanceof Error) {
        let url: string | undefined;
        if (axios.isAxiosError(error)) {
            url = error.config.url;
            if (url !== undefined) {
                url = " for URL: " + url;
            } else {
                url = "";
            }
        }

        console.error("ERROR: " + error.message + url);
        console.error(error.stack);
    } else if (typeof error === "string") {
        console.error(error);
    }

    let errorMessage = "An error occurred";
    if (DEBUG_ERROR_MESSAGES) {
        if (error instanceof Error) {
            errorMessage += "\n" + error.message + "\n" + error.stack;
        } else if (typeof error === "string") {
            errorMessage += "\n" + error;
        }
    }

    response.status(500);
    response.send(errorMessage);
    return;
}

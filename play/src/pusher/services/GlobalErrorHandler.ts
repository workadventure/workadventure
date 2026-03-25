import type { Request, Response, NextFunction } from "express";
import { ErrorApiData } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { HttpError } from "@workadventure/shared-utils/src/Fetch/fetchUtils";
//import { DEBUG_ERROR_MESSAGES } from "../enums/EnvironmentVariable";

export function globalErrorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
    if (error instanceof Error) {
        let url: string | undefined;
        if (error instanceof HttpError) {
            url = error.url;
            if (url !== undefined) {
                url = " for URL: " + url;
            } else {
                url = "";
            }
        }

        console.error(error.message + url);
        console.error(error.stack);
    } else if (typeof error === "string") {
        console.error(error);
    }

    Sentry.captureException(error);

    if (error instanceof HttpError) {
        response.status(error.status);
        let responseData: unknown = undefined;
        try {
            responseData = error.body === "" ? undefined : JSON.parse(error.body);
        } catch {
            responseData = error.body;
        }

        const errorType = ErrorApiData.safeParse(responseData);
        if (!errorType.success) {
            response.send(
                "An error occurred: " +
                    error.status +
                    " " +
                    (error.body && error.message ? error.message : error.statusText)
            );
        } else response.json(errorType.data);
        return;
    } else {
        /*let errorMessage = "An error occurred";
        if (DEBUG_ERROR_MESSAGES) {
            if (error instanceof Error) {
                errorMessage += "\n" + error.message + "\n" + error.stack;
            } else if (typeof error === "string") {
                errorMessage += "\n" + error;
            }
        }

        response.status(500);
        response.send(errorMessage);*/
        next(error);
        return;
    }
}

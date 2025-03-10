import type { Request, Response, NextFunction } from "express";
import { isAxiosError } from "axios";
import { ErrorApiData } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
//import { DEBUG_ERROR_MESSAGES } from "../enums/EnvironmentVariable";

export function globalErrorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
    if (error instanceof Error) {
        let url: string | undefined;
        if (isAxiosError(error)) {
            url = error.config?.url;
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

    if (isAxiosError(error) && error.response) {
        response.status(error.response.status);
        const errorType = ErrorApiData.safeParse(error?.response?.data);
        if (!errorType.success) {
            response.send(
                "An error occurred: " +
                    error.response.status +
                    " " +
                    (error.response.data && error.message ? error.message : error.response.statusText)
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

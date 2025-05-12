import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isErrorApiErrorData = extendApi(
  z.object({
    status: z.literal("error"),
    type: z.literal("error"),
    code: extendApi(z.string(), {
      description:
        "The system code of an error, it must be in SCREAMING_SNAKE_CASE.",
      example: "ROOM_NOT_FOUND",
    }),
    title: extendApi(z.string(), {
      description: "Big title displayed on the error screen.",
      example: "ERROR",
    }),
    subtitle: extendApi(z.string(), {
      description:
        "Subtitle displayed to let the user know what is the main subject of the error.",
      example: "The room was not found.",
    }),
    details: extendApi(z.string(), {
      description:
        "Some others details on what the user can do if he don't understand the error.",
      example:
        "If you would like more information, you can contact the administrator or us at example@workadventu.re.",
    }),
    image: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just under the logo in the error screen.",
      example: "https://example.com/error.png",
    }),
    imageLogo: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just at the place of the logo in the error screen.",
      example: "https://example.com/error.png",
    }),
  }),
  {
    description:
      'This is an error that can be returned by the API, its type must be equal to "error".\n If such an error is caught, an error screen will be displayed.',
  }
);

export const isErrorApiRetryData = extendApi(
  z.object({
    status: z.literal("error"),
    type: z.literal("retry"),
    code: extendApi(z.string(), {
      description:
        "The system code of an error, it must be in SCREAMING_SNAKE_CASE. \n It will not be displayed to the user.",
      example: "WORLD_FULL",
    }),
    title: extendApi(z.string(), {
      description: "Big title displayed on the error screen.",
      example: "ERROR",
    }),
    subtitle: extendApi(z.string(), {
      description:
        "Subtitle displayed to let the user know what is the main subject of the error.",
      example: "Too successful, your WorkAdventure world is full!",
    }),
    details: extendApi(z.string(), {
      description:
        "Some others details on what the user can do if he don't understand the error.",
      example: "New automatic attempt in 30 seconds",
    }),
    image: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just under the logo in the waiting screen.",
      example: "https://example.com/wait.png",
    }),
    imageLogo: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just at the place of the logo in the waiting screen.",
      example: "https://example.com/wait.png",
    }),
    buttonTitle: extendApi(z.string().nullable().optional(), {
      description:
        "If this is not defined the button and the parameter canRetryManual is set to true, the button will be not displayed at all.",
      example: "Retry",
    }),
    timeToRetry: extendApi(z.number(), {
      description:
        "This is the time (in millisecond) between the next auto refresh of the page.",
      example: 30_000,
    }),
    canRetryManual: extendApi(z.boolean(), {
      description:
        "This boolean show or hide the button to let the user refresh manually the current page.",
      example: true,
    }),
  }),
  {
    description:
      'This is an error that can be returned by the API, its type must be equal to "retry".\n' +
      "If such an error is caught, a waiting screen will be displayed.",
  }
);

export const isErrorApiRedirectData = extendApi(
  z.object({
    status: z.literal("error"),
    type: z.literal("redirect"),
    urlToRedirect: extendApi(z.string(), {
      description: "A URL specified to redirect the user onto it directly",
      example: "/contact-us",
    }),
  }),
  {
    description:
      'This is an error that can be returned by the API, its type must be equal to "redirect".\n' +
      "If such an error is caught, the user will be automatically redirected to urlToRedirect.",
  }
);

export const isErrorApiUnauthorizedData = extendApi(
  z.object({
    status: z.literal("error"),
    type: z.literal("unauthorized"),
    code: extendApi(z.string(), {
      description:
        "This is the system code of an error, it must be in SCREAMING_SNAKE_CASE.",
      example: "USER_ACCESS_FORBIDDEN",
    }),
    title: extendApi(z.string(), {
      description: "Big title displayed on the error screen.",
      example: "ERROR",
    }),
    subtitle: extendApi(z.string(), {
      description:
        "Subtitle displayed to let the user know what is the main subject of the error.",
      example: "You can't access this place.",
    }),
    details: extendApi(z.string(), {
      description:
        "Some others details on what the user can do if he don't understand the error.",
      example:
        "If you would like more information, you can contact the administrator or us at example@workadventu.re.",
    }),
    image: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just under the logo in the error screen.",
      example: "https://example.com/error.png",
    }),
    imageLogo: extendApi(z.string().optional(), {
      description:
        "The URL of the image displayed just under the logo in the error screen.",
      example: "https://example.com/error.png",
    }),
    buttonTitle: extendApi(z.string().nullable().optional(), {
      description:
        "If this is not defined the button to logout will be not displayed.",
      example: "Log out",
    }),
  }),
  {
    description:
      'This is an error that can be returned by the API, its type must be equal to "unauthorized".\n' +
      "If such an error is caught, an error screen will be displayed with a button to let him logout and go to login page.",
  }
);

export const ErrorApiData = z.discriminatedUnion("type", [
  isErrorApiErrorData,
  isErrorApiRetryData,
  isErrorApiRedirectData,
  isErrorApiUnauthorizedData,
]);

export type ErrorApiErrorData = z.infer<typeof isErrorApiErrorData>;
export type ErrorApiRetryData = z.infer<typeof isErrorApiRetryData>;
export type ErrorApiRedirectData = z.infer<typeof isErrorApiRedirectData>;
export type ErrorApiUnauthorizedData = z.infer<typeof isErrorApiUnauthorizedData>;
export type ErrorApiData = z.infer<typeof ErrorApiData>;

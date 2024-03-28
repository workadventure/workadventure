import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isApplicationDefinitionInterface = z.object({
  name: extendApi(z.string(), {
    description: "The name of the application",
    example: "Onboarding woka",
  }),
  script: extendApi(z.string().optional(), {
    description: "The url of the application",
    example: "http://example.com/my/script.js",
  }),
  doc: extendApi(z.string().optional(), {
    description: "The url of the documentation",
    example: "http://example.com/my/doc.html",
  }),
  image: extendApi(z.string().optional(), {
    description: "The url of the application icon",
    example: "http://example.com/my/image.png",
  }),
  description: extendApi(z.string().optional(), {
    description: "The description of the application",
    example: "This application is a great application",
  }),
  enabled: extendApi(z.boolean().optional().default(false), {
    description: "Is the application enabled",
    example: true,
  }),
  regexUrl: extendApi(z.string().optional(), {
    description: "The regular expression to match the url",
    example: "https://www.youtube.com/watch?v=(.*)",
  }),
  targetUrl: extendApi(z.string().optional(), {
    description: "The target url",
    example: "https://www.youtube.com/embed/$1",
  }),
});
export type ApplicationDefinitionInterface = z.infer<
  typeof isApplicationDefinitionInterface
>;

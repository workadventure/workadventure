import fs from "fs";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  BuiltinOnboardingAnchor,
  BuiltinTourId,
  OnboardingAnchor,
  OnboardingAnchorArea,
  OnboardingData,
  OnboardingText,
} from "./JsonMessages/OnboardingData";

/**
 * Publishes the onboarding config of a world as JSON Schema, at
 * https://docs.workadventu.re/docs/schema/onboarding.json. Self-hosters check their file with it, and the
 * SaaS admin checks what its editor saves. Its editor reads the anchors and their areas, and the built-in tours (all
 * with their names) in `$defs`.
 */
const { $schema: _, ...schema } = zodToJsonSchema(OnboardingData, {
  definitions: {
    OnboardingAnchor,
    BuiltinOnboardingAnchor,
    OnboardingAnchorArea,
    OnboardingText,
    BuiltinTourId,
  },
  definitionPath: "$defs",
}) as Record<string, unknown>;

const jsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://docs.workadventu.re/docs/schema/onboarding.json",
  title: "WorkAdventure onboarding",
  ...schema,
};

fs.writeFileSync(
  fileURLToPath(
    new URL("../../../docs/schema/onboarding.json", import.meta.url),
  ),
  JSON.stringify(jsonSchema, null, 2) + "\n",
);

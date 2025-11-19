import { z } from "zod";
import { EnvVariable } from "./types.js";

/**
 * Extract environment variables from a Zod schema
 */
export function extractEnvVariables(schema: z.ZodObject<any>): EnvVariable[] {
    const shape = schema.shape;
    const variables: EnvVariable[] = [];

    for (const key of Object.keys(shape)) {
        const field = shape[key];
        const variable = extractVariable(key, field);
        variables.push(variable);
    }

    return variables;
}

/**
 * Extract metadata from a single Zod field
 */
function extractVariable(name: string, field: z.ZodTypeAny): EnvVariable {
    let type = "string";
    let required = true;
    let description = "-";
    let currentField = field;

    // Unwrap effects (transforms, etc.) first, but preserve description if present
    // This is important because .optional().transform() creates ZodEffects(ZodOptional(...))
    while (currentField instanceof z.ZodEffects) {
        // Try to get description from the effects layer first
        if (currentField._def.description && description === "-") {
            description = currentField._def.description;
        }
        currentField = currentField._def.schema;
    }

    // Now unwrap optional fields
    if (currentField instanceof z.ZodOptional) {
        required = false;
        currentField = currentField._def.innerType;
    }

    // Unwrap default fields
    if (currentField instanceof z.ZodDefault) {
        required = false;
        currentField = currentField._def.innerType;
    }

    // Extract description from the unwrapped schema
    if (currentField._def.description && description === "-") {
        description = currentField._def.description;
    }

    // Determine type
    type = getZodType(currentField);

    return {
        name,
        type,
        required,
        description,
    };
}

/**
 * Get a human-readable type from a Zod schema
 */
function getZodType(field: z.ZodTypeAny): string {
    if (field instanceof z.ZodString) {
        return "string";
    }
    if (field instanceof z.ZodNumber) {
        return "number";
    }
    if (field instanceof z.ZodBoolean) {
        return "boolean";
    }
    if (field instanceof z.ZodUnion) {
        const options = field._def.options;
        const types = options.map((opt: z.ZodTypeAny) => getZodType(opt));
        // Remove duplicates
        const uniqueTypes = [...new Set(types)];
        return uniqueTypes.join(" \\| ");
    }
    if (field instanceof z.ZodLiteral) {
        return `"${field._def.value}"`;
    }
    if (field instanceof z.ZodEnum) {
        return field._def.values.map((v: string) => `"${v}"`).join(" \\| ");
    }
    if (field instanceof z.ZodArray) {
        return `${getZodType(field._def.type)}[]`;
    }

    // Fallback
    return "string";
}

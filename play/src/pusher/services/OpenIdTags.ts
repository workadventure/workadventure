import { z } from "zod";

/**
 * The tag WorkAdventure checks to grant admin rights (in the pusher and in the back).
 */
export const ADMIN_TAG = "admin";

/**
 * A list of tags, keeping only the string entries.
 */
const tagListSchema = z
    .array(z.unknown())
    .transform((tags) => tags.filter((tag): tag is string => typeof tag === "string"));

/**
 * The tags claim sent by the OpenID provider. Providers send it as an array, as a JSON-encoded
 * array, or as a single string; anything else (or a malformed value) yields an empty list.
 */
const tagsClaimSchema = z
    .union([
        tagListSchema,
        z.string().transform((value) => {
            try {
                const asJson = tagListSchema.safeParse(JSON.parse(value));
                if (asJson.success) {
                    return asJson.data;
                }
            } catch {
                // Not JSON: treat it as a single tag
            }
            return [value];
        }),
    ])
    .catch([]);

/**
 * Maps the admin tag configured with OPENID_ADMIN_TAG to the internal "admin" tag.
 *
 * - If no admin tag is configured, the claim is returned unchanged (current behaviour).
 * - If one is configured, a user gets "admin" only when the provider sends that tag. An "admin" tag
 *   sent by the provider is dropped, so that a group that happens to be called "admin" in the identity
 *   provider does not grant admin rights in WorkAdventure. The other tags are kept as they are.
 */
export function mapOpenIdAdminTag(rawTags: unknown, adminTag: string | undefined): string[] | undefined {
    if (rawTags === undefined || rawTags === null) {
        return undefined;
    }

    const tags = tagsClaimSchema.parse(rawTags);
    const configuredAdminTag = adminTag?.trim();
    if (!configuredAdminTag || configuredAdminTag === ADMIN_TAG) {
        return tags;
    }

    const mappedTags = tags.filter((tag) => tag !== ADMIN_TAG);
    if (tags.includes(configuredAdminTag)) {
        mappedTags.push(ADMIN_TAG);
    }
    return mappedTags;
}

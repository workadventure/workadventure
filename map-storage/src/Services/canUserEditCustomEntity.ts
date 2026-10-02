import type { EntityRawPrefab } from "@workadventure/map-editor";

/**
 * Returns true iff the given user is allowed to modify or delete the given custom entity prefab.
 *
 * Users without map edit rights can still reach the map editor (through a zone edit tag or a
 * personal area) and upload their own custom entities. This check exists so that they cannot
 * modify or delete the custom entities uploaded by someone else: the custom entity collection is
 * shared by every map of the domain, so a deletion from one room removes the asset everywhere.
 *
 * - `userCanEdit` is true for admin/editor tags, MAP_EDITOR_ALLOWED_USERS, and when
 *   MAP_EDITOR_ALLOW_ALL_USERS is set. In that last case everybody can edit everything, which is
 *   the intended behaviour for open self-hosted instances.
 * - An entity with no `ownerId` was uploaded before ownership was recorded: only a user with map
 *   edit rights can touch it.
 * - An unknown entity is refused too, so that a forged command cannot slip through.
 */
export function canUserEditCustomEntity(
    entity: Pick<EntityRawPrefab, "ownerId"> | undefined,
    userUUID: string | undefined,
    userCanEdit: boolean,
): boolean {
    if (userCanEdit) {
        return true;
    }
    if (!entity?.ownerId || !userUUID) {
        return false;
    }
    return entity.ownerId === userUUID;
}

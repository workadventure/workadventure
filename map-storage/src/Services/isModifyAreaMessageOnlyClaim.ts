import { AreaDataProperties, type AreaData } from "@workadventure/map-editor";
import type { ModifyAreaMessage } from "@workadventure/messages";
import _ from "lodash";

/**
 * Returns true iff the given modifyAreaMessage represents only a claim or revoke of a personal area:
 * the existing area has a personal area property, the only change is personalAreaPropertyData.ownerId
 * (null → userUUID for claim, userUUID → null for revoke), and geometry and other properties are unchanged.
 *
 * This check exists so that users without map edit rights (non-admin) can still claim or revoke their
 * personal area when entering a zone with dynamic claim mode, without being allowed to modify the map
 * in any other way.
 *
 * A proper long-term solution would be to associate this data with areas outside the WAM, similar to
 * the area lock mechanism but persisted (e.g. a dedicated "personal area data" store or a WAM section
 * writable by all users for claim/revoke only). Once that is in place, this check can be removed (see TODO below).
 *
 * TODO: Remove this check once we have a proper system for associating data with areas
 * (e.g., personal area data) or a WAM section accessible to all users.
 */
export function isModifyAreaMessageOnlyClaim(
    message: ModifyAreaMessage,
    userUUID: string,
    existingArea: AreaData | undefined
): boolean {
    if (!existingArea) {
        return false;
    }
    const existingPersonalProperty = existingArea.properties.find((p) => p.type === "personalAreaPropertyData");
    if (!existingPersonalProperty || existingPersonalProperty.type !== "personalAreaPropertyData") {
        return false;
    }
    const existingOwnerId = existingPersonalProperty.ownerId ?? null;
    // Area claimed by someone else: neither claim nor revoke allowed.
    if (existingOwnerId !== null && existingOwnerId !== userUUID) {
        return false;
    }
    // Command must contain properties to change ownerId (claim or revoke).
    if (!message.modifyProperties || !message.properties) {
        return false;
    }
    const parsedProperties = AreaDataProperties.safeParse(message.properties).data;
    if (!parsedProperties) {
        return false;
    }
    const newPersonalProperty = parsedProperties.find((p) => p.type === "personalAreaPropertyData");
    if (!newPersonalProperty || newPersonalProperty.type !== "personalAreaPropertyData") {
        return false;
    }
    const newOwnerId = newPersonalProperty.ownerId ?? null;
    const isClaim = existingOwnerId === null && newOwnerId === userUUID;
    const isRevoke = existingOwnerId === userUUID && newOwnerId === null;
    if (!isClaim && !isRevoke) {
        return false;
    }
    // Geometry must be unchanged.
    if (
        (message.x !== undefined && message.x !== existingArea.x) ||
        (message.y !== undefined && message.y !== existingArea.y) ||
        (message.width !== undefined && message.width !== existingArea.width) ||
        (message.height !== undefined && message.height !== existingArea.height)
    ) {
        return false;
    }
    // Command must only change claim-related data: same properties count, only personal area ownerId (and optionally name) changed.
    if (parsedProperties.length !== existingArea.properties.length) {
        return false;
    }
    let personalAreaOwnerIdChanged = false;
    for (let i = 0; i < existingArea.properties.length; i++) {
        const existingProp = existingArea.properties[i];
        const newProp = parsedProperties.find((p) => p.id === existingProp.id);
        if (!newProp || newProp.type !== existingProp.type) {
            return false;
        }
        if (existingProp.type === "personalAreaPropertyData" && newProp.type === "personalAreaPropertyData") {
            if (!_.isEqual(_.omit(existingProp, "ownerId"), _.omit(newProp, "ownerId"))) {
                return false;
            }
            personalAreaOwnerIdChanged = true;
        } else if (!_.isEqual(existingProp, newProp)) {
            return false;
        }
    }
    return personalAreaOwnerIdChanged;
}

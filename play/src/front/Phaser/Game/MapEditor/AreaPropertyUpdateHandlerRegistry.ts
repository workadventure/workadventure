import type { AreaData, AreaDataProperty, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
import * as Sentry from "@sentry/svelte";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import {
    buildListenerEntriesFromAssociatedIds,
    getListenerAreasReferencingSpeakerWherePlayerIs,
    getSpeakerPropertyForAreaId,
} from "./MegaphoneAssociatedZonesAndUpdateHelpers";
import type { ListenerEntry } from "./MegaphoneAssociatedZonesAndUpdateHelpers";

/**
 * Context passed to property-update callbacks when an area property is updated.
 * precomputedAssociatedAreaIds is set when the update was triggered from listenAreaChanges
 * so handlers can avoid re-computing associated zones.
 * megaphoneDeps is provided by the caller at invoke time (dependency inversion).
 */
export interface AreaPropertyUpdateContext<T extends AreaDataProperty = AreaDataProperty> {
    area: AreaData;
    oldProperty: T;
    newProperty: T;
    /** When present, associated area ids were already computed by the trigger path. */
    precomputedAssociatedAreaIds?: string[];
    /** Dependencies for megaphone handlers, passed at invoke time by the listener. */
    megaphoneDeps?: MegaphoneUpdateHandlerDeps;
}

/**
 * Handler for property updates of a given type. Registered per property type;
 * optional hasRelevantChange avoids running onUpdate when the change is not meaningful.
 */
export interface AreaPropertyUpdateHandler<T extends AreaDataProperty = AreaDataProperty> {
    hasRelevantChange?(oldProperty: T, newProperty: T): boolean;
    onUpdate(context: AreaPropertyUpdateContext<T>): void | Promise<void>;
}

/**
 * Dependencies required to run the megaphone property update handlers
 * (speaker/listener zone refresh when properties change).
 */
export interface MegaphoneUpdateHandlerDeps {
    getAreas(): Map<string, AreaData> | undefined;
    getAreasManager(): { isCurrentPlayerInArea(areaId: string): boolean } | undefined;
    refreshListenerZonesForSpeakerChange(
        oldSpeakerProperty: SpeakerMegaphonePropertyData,
        newSpeakerProperty: SpeakerMegaphonePropertyData,
        listenerEntries: ListenerEntry[]
    ): Promise<void>;
}

/**
 * Registry of property-update handlers, with built-in registration for megaphone (speaker/listener) handlers.
 * Decouples the "invoke handler by property type" mechanism and megaphone-specific logic from AreasPropertiesListener.
 */
export class AreaPropertyUpdateHandlerRegistry {
    private readonly handlers = new Map<AreaDataProperty["type"], AreaPropertyUpdateHandler>();

    /**
     * Registers a handler for a given property type.
     */
    public register<T extends AreaDataProperty>(type: T["type"], handler: AreaPropertyUpdateHandler<T>): void {
        this.handlers.set(type, handler as AreaPropertyUpdateHandler);
    }

    /**
     * Registers the built-in listenerMegaphone and speakerMegaphone update handlers.
     * Megaphone deps are passed at invoke time by the caller.
     */
    public registerMegaphoneHandlers(): void {
        this.register("listenerMegaphone", {
            onUpdate: (context) => this.onListenerMegaphonePropertyUpdated(context),
        });
        this.register("speakerMegaphone", {
            hasRelevantChange(oldProp: SpeakerMegaphonePropertyData, newProp: SpeakerMegaphonePropertyData): boolean {
                return (
                    oldProp.name !== newProp.name ||
                    oldProp.seeAttendees !== newProp.seeAttendees ||
                    oldProp.chatEnabled !== newProp.chatEnabled
                );
            },
            onUpdate: (context) => this.onSpeakerMegaphonePropertyUpdated(context),
        });
    }

    /**
     * Invokes the handler for the given property update, if one is registered.
     * megaphoneDeps must be provided when the updated property is megaphone-related.
     */
    public invoke(
        area: AreaData,
        oldProperty: AreaDataProperty,
        newProperty: AreaDataProperty,
        precomputedAssociatedAreaIds?: string[],
        megaphoneDeps?: MegaphoneUpdateHandlerDeps
    ): void {
        const handler = this.handlers.get(newProperty.type);
        if (!handler) {
            return;
        }
        if (handler.hasRelevantChange && !handler.hasRelevantChange(oldProperty, newProperty)) {
            return;
        }
        const result = handler.onUpdate({
            area,
            oldProperty,
            newProperty,
            precomputedAssociatedAreaIds,
            megaphoneDeps,
        });
        if (result instanceof Promise) {
            result.catch((e) => {
                if (e instanceof AbortError) {
                    return;
                }
                console.error(e);
                Sentry.captureException(e);
            });
        }
    }

    private onSpeakerMegaphonePropertyUpdated(context: AreaPropertyUpdateContext): void {
        if (context.newProperty.type !== "speakerMegaphone" || context.oldProperty.type !== "speakerMegaphone") {
            return;
        }
        const deps = context.megaphoneDeps;
        if (!deps) {
            return;
        }
        const { area, oldProperty, newProperty, precomputedAssociatedAreaIds } = context;
        const areas = deps.getAreas();
        const areasManager = deps.getAreasManager();
        const listenerEntries =
            areas && areasManager
                ? precomputedAssociatedAreaIds?.length
                    ? buildListenerEntriesFromAssociatedIds(
                          areas,
                          (id) => areasManager.isCurrentPlayerInArea(id),
                          area.id,
                          precomputedAssociatedAreaIds
                      )
                    : getListenerAreasReferencingSpeakerWherePlayerIs(
                          areas,
                          (id) => areasManager.isCurrentPlayerInArea(id),
                          area.id
                      )
                : [];
        if (listenerEntries.length === 0) {
            return;
        }
        deps.refreshListenerZonesForSpeakerChange(oldProperty, newProperty, listenerEntries).catch((e) => {
            if (e instanceof AbortError) {
                return;
            }
            console.error(e);
            Sentry.captureException(e);
        });
    }

    private onListenerMegaphonePropertyUpdated(context: AreaPropertyUpdateContext): void {
        if (context.newProperty.type !== "listenerMegaphone") {
            return;
        }
        const deps = context.megaphoneDeps;
        if (!deps) {
            return;
        }
        const { area } = context;
        const listenerProperty = context.newProperty;
        const areasManager = deps.getAreasManager();
        if (!areasManager?.isCurrentPlayerInArea(area.id)) {
            return;
        }
        const listenerEntries = [{ listenerArea: area, listenerProperty }];
        const areas = deps.getAreas();
        const speakerProperty = areas
            ? getSpeakerPropertyForAreaId(areas, listenerProperty.speakerZoneName)
            : undefined;
        if (!speakerProperty) {
            return;
        }
        deps.refreshListenerZonesForSpeakerChange(speakerProperty, speakerProperty, listenerEntries).catch((e) => {
            if (e instanceof AbortError) {
                return;
            }
            console.error(e);
            Sentry.captureException(e);
        });
    }
}

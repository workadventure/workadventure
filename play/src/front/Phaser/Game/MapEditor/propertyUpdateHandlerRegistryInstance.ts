import { AreaPropertyUpdateHandlerRegistry } from "./AreaPropertyUpdateHandlerRegistry";

/**
 * Single shared instance of the property-update handler registry with megaphone handlers
 * (listenerMegaphone, speakerMegaphone) already registered.
 * Injected into AreasPropertiesListener via constructor (dependency inversion).
 * Megaphone deps are passed at invoke time by the listener.
 */
const propertyUpdateHandlerRegistry = new AreaPropertyUpdateHandlerRegistry();
propertyUpdateHandlerRegistry.registerMegaphoneHandlers();

export const propertyUpdateHandlerRegistryInstance = propertyUpdateHandlerRegistry;

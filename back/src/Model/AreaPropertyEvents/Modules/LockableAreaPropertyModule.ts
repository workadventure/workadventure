import type { AreaPropertyEventManager } from "../AreaPropertyEventManager";
import type { AreaPropertyEventModuleInterface } from "../AreaPropertyEventModuleInterface";

export class LockableAreaPropertyModule implements AreaPropertyEventModuleInterface {
    public init(manager: AreaPropertyEventManager): void {
        manager.register("areaEmpty", {
            propertyType: "lockableAreaPropertyData",
            variableKey: "lock",
            value: "false",
            onlyIfValue: "true",
        });
        manager.register("areaGeometryChange", {
            propertyType: "lockableAreaPropertyData",
            variableKey: "lock",
            value: "false",
            onlyIfValue: "true",
        });
    }
}

import { IframeResponseEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";

export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: {
    typeChecker: Function
    callback: Function
} } = {}

const importType = Promise.all([
    import("./Api/iframe/popup"),
    import("./Api/iframe/chatmessage"),
    import("./Api/iframe/Sound"),
    import("./Api/iframe/zone-events"),
    import("./Api/iframe/Navigation"),
    import("./Api/iframe/CoWebsite"),
    import("./Api/iframe/Player"),
    import("./Api/iframe/Bubble")
])


type PromiseReturnType<P> = P extends Promise<infer T> ? T : P

type WorkadventureCommandClasses = PromiseReturnType<typeof importType>[number]["default"];

type KeysOfUnion<T> = T extends T ? keyof T : never

type ObjectWithKeyOfUnion<Key, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O[Key] : never) : never

type ApiKeys = KeysOfUnion<WorkadventureCommandClasses>;

type ObjectOfKey<Key extends ApiKeys, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O : never) : never

type ShouldAddAttribute<Key extends ApiKeys> = ObjectWithKeyOfUnion<Key>;

type WorkadventureFunctions = { [K in ApiKeys]: ObjectWithKeyOfUnion<K> extends Function ? K : never }[ApiKeys]

type WorkadventureFunctionsFilteredByRoot = { [K in WorkadventureFunctions]: ObjectOfKey<K>["addMethodsAtRoot"] extends true ? K : never }[WorkadventureFunctions]


type JustMethodKeys<T> = ({ [P in keyof T]: T[P] extends Function ? P : never })[keyof T];
type JustMethods<T> = Pick<T, JustMethodKeys<T>>;

type SubObjectTypes = {
    [importCl in WorkadventureCommandClasses as importCl["subObjectIdentifier"]]: JustMethods<importCl>;
};

type WorkAdventureApiFiles = {
    [Key in WorkadventureFunctionsFilteredByRoot]: ShouldAddAttribute<Key>
} & SubObjectTypes

export interface WorkAdventureApi extends WorkAdventureApiFiles {

}

declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}


window.WA = {
    ...({} as WorkAdventureApiFiles),
}

window.addEventListener('message', message => {
    if (message.source !== window.parent) {
        return; // Skip message in this event listener
    }
    const payload = message.data;
    console.debug(payload);

    if (isIframeResponseEventWrapper(payload)) {
        const payloadData = payload.data;

        if (registeredCallbacks[payload.type] && registeredCallbacks[payload.type]?.typeChecker(payloadData)) {
            registeredCallbacks[payload.type]?.callback(payloadData)
            return
        }
    }

    // ...
});
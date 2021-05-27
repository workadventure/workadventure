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

type WorkAdventureApi = {
    [Key in WorkadventureFunctionsFilteredByRoot]: ShouldAddAttribute<Key>
} & SubObjectTypes


declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

async function populateWa(): Promise<void> {
    const wa: Partial<WorkAdventureApi> = {}
    for (const apiImport of await importType) {
        const classInstance = apiImport.default
        const commandPrototype = Object.getPrototypeOf(classInstance);
        const commandClassPropertyNames = Object.getOwnPropertyNames(commandPrototype).filter(name => name !== "constructor");
        const importObject: Partial<WorkAdventureApi> = {}
        for (const prop of commandClassPropertyNames) {
            const apiImportKey = prop as keyof typeof classInstance;
            if (typeof classInstance[apiImportKey] === "function") {
                importObject[apiImportKey as keyof WorkAdventureApi] = commandPrototype[apiImportKey] as never
            }
        }
        wa[classInstance.subObjectIdentifier] = importObject as never
        if (classInstance.addMethodsAtRoot) {
            Object.assign(wa, importObject)
        }
    }

    window.WA = Object.assign({}, wa) as WorkAdventureApi
}


populateWa()

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
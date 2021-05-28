import type { WorkadventureImport } from './iframe_api';

type PromiseReturnType<P> = P extends Promise<infer T> ? T : P;
type WorkadventureCommandClasses = PromiseReturnType<WorkadventureImport>[number];
type KeysOfUnion<T> = T extends T ? keyof T : never;
type ObjectWithKeyOfUnion<Key, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O[Key] : never) : never;
type ApiKeys = KeysOfUnion<WorkadventureCommandClasses>;
type ObjectOfKey<Key extends ApiKeys, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O : never) : never;
type ShouldAddAttribute<Key extends ApiKeys> = ObjectWithKeyOfUnion<Key>;
type WorkadventureFunctions = {
    [K in ApiKeys]: ObjectWithKeyOfUnion<K> extends Function ? K : never;
}[ApiKeys];
type WorkadventureFunctionsFilteredByRoot = {
    [K in WorkadventureFunctions]: ObjectOfKey<K>["addMethodsAtRoot"] extends true ? K : never;
}[WorkadventureFunctions];
type JustMethodKeys<T> = ({
    [P in keyof T]: T[P] extends Function ? P : never;
})[keyof T];
type JustMethods<T> = Pick<T, JustMethodKeys<T>>;
type SubObjectTypes = {
    [importCl in WorkadventureCommandClasses as importCl["subObjectIdentifier"]]: JustMethods<importCl>;
};
export type WorkAdventureApi = {
    [Key in WorkadventureFunctionsFilteredByRoot]: ShouldAddAttribute<Key>;
} & SubObjectTypes;

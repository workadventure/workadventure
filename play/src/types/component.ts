import type { Component } from "svelte";

export type WorkAdventureComponentProps = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkAdventureComponent<Props extends WorkAdventureComponentProps = any> = Component<
    Props,
    Record<string, unknown>,
    string
>;

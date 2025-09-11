import { createNestedStore } from "@workadventure/store-utils";
import { writable } from "svelte/store";
import { GameScene } from "../Phaser/Game/GameScene";
import { TrackWrapper } from "../Streaming/Common/TrackWrapper";
import { gameSceneStore } from "./GameSceneStore";

export const broadcastTracksStore = createNestedStore<GameScene | undefined, Map<string, TrackWrapper>>(
    gameSceneStore,
    (gameScene) => (gameScene ? gameScene.broadcastService.getTracks() : writable<Map<string, TrackWrapper>>(new Map()))
);

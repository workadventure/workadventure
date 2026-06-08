import * as Phaser from "phaser";

/*
 * FIXME Phaser 4 migration:
 * Some phaser3-rex-plugins modules are published as ES modules but still read
 * Phaser from the global scope instead of importing it. Keep this explicit
 * compatibility bridge while we are on Phaser 3 / rex plugins, then remove it
 * when the plugins are replaced or become proper Phaser 4-compatible ESM.
 */
(globalThis as typeof globalThis & { Phaser: typeof Phaser }).Phaser = Phaser;

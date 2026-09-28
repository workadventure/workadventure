/**
 * NG Academy — Character Life System (registry)
 * ---------------------------------------------
 * Per-scene registry of life directors + the current "speaker" info, so
 * nearby characters can face whoever is talking (social attention).
 *
 * Extensibility: new world-level life events (bell, applause…) can be
 * announced here and consumed by CharacterLife without touching other files.
 */
import type { CharacterLife } from "./CharacterLife";

export interface SpeakerInfo {
    name: string;
    x: number;
    y: number;
}

/** A real user currently standing in a teacher zone (role by location). */
export interface TeacherEntry {
    name: string;
    x: number;
    y: number;
}

export class LifeRegistry {
    private static livesByScene = new WeakMap<object, Map<string, CharacterLife>>();
    private static speakerByScene = new WeakMap<object, { speaker: SpeakerInfo; until: number }>();
    private static teachersByScene = new WeakMap<object, Map<string, TeacherEntry>>();

    static register(scene: object, life: CharacterLife): void {
        let lives = LifeRegistry.livesByScene.get(scene);
        if (!lives) {
            lives = new Map<string, CharacterLife>();
            LifeRegistry.livesByScene.set(scene, lives);
        }
        lives.set(life.name, life);
    }

    static unregister(scene: object, name: string): void {
        LifeRegistry.livesByScene.get(scene)?.delete(name);
    }

    /** Announce that `name` is talking at (x,y); nearby idle characters will face them. */
    static announce(scene: object, speaker: SpeakerInfo, durationMs = 4000): void {
        LifeRegistry.speakerByScene.set(scene, { speaker, until: Date.now() + durationMs });
        const lives = LifeRegistry.livesByScene.get(scene);
        if (lives) {
            for (const life of lives.values()) {
                life.onSpeakerAnnounced(speaker);
            }
        }
    }

    static speaker(scene: object): SpeakerInfo | undefined {
        const entry = LifeRegistry.speakerByScene.get(scene);
        if (entry && entry.until > Date.now()) {
            return entry.speaker;
        }
        return undefined;
    }

    /* ---------------- role by location (teachers) ---------------- */

    /** Register/refresh that `entry.name` is teaching at (x,y) right now. */
    static setTeacher(scene: object, entry: TeacherEntry): void {
        let teachers = LifeRegistry.teachersByScene.get(scene);
        if (!teachers) {
            teachers = new Map<string, TeacherEntry>();
            LifeRegistry.teachersByScene.set(scene, teachers);
        }
        teachers.set(entry.name, entry);
    }

    static clearTeacher(scene: object, name: string): void {
        LifeRegistry.teachersByScene.get(scene)?.delete(name);
    }

    /** Nearest registered teacher within `maxDistPx` of (x,y), if any. */
    static nearestTeacher(
        scene: object,
        x: number,
        y: number,
        maxDistPx: number,
        excludeName?: string,
    ): TeacherEntry | undefined {
        const teachers = LifeRegistry.teachersByScene.get(scene);
        if (!teachers) return undefined;
        const max2 = maxDistPx * maxDistPx;
        let best: TeacherEntry | undefined;
        let bestD2 = max2;
        for (const t of teachers.values()) {
            if (excludeName !== undefined && t.name === excludeName) continue;
            const dx = t.x - x;
            const dy = t.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= bestD2) {
                bestD2 = d2;
                best = t;
            }
        }
        return best;
    }
}

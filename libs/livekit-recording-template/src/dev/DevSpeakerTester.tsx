import { useCallback, useEffect, useMemo, useState } from "react";
import { FakeVideoCell } from "./FakeVideoCell";

const STORAGE_KEY = "livekit-recording-template-dev-speaker-count";
/** 1 vue principale + jusqu’à 16 miniatures en rail 12 % (comme l’enregistrement réel). */
const MAX_SPEAKER_TOTAL = 17;

function readInitialCount(): number {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return 5;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
            return 5;
        }
        return Math.min(MAX_SPEAKER_TOTAL, Math.max(1, n));
    } catch {
        return 5;
    }
}

/**
 * Outil de mise en page speaker (80/20) avec flux factices.
 * Activer en dev : `npm run dev` puis `/?devSpeaker=1` (ou `npm run dev:speaker`).
 */
export function DevSpeakerTester(): JSX.Element {
    const [count, setCount] = useState(readInitialCount);

    useEffect(() => {
        document.title = "Dev · speaker layout (WorkAdventure recording template)";
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, String(count));
        } catch {
            // ignore
        }
    }, [count]);

    const sidebarCount = useMemo(() => Math.max(0, Math.min(16, count - 1)), [count]);

    const bump = useCallback((delta: number) => {
        setCount((c) => Math.min(MAX_SPEAKER_TOTAL, Math.max(1, c + delta)));
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "+" || e.key === "=") {
                bump(1);
            } else if (e.key === "-" || e.key === "_") {
                bump(-1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [bump]);

    return (
        <div className="dev-mosaic-tester recording-template">
            <header className="dev-mosaic-tester__toolbar" aria-label="Contrôles speaker de test">
                <strong className="dev-mosaic-tester__title">Speaker (dev)</strong>
                <span className="dev-mosaic-tester__hint">Touches + / − · tuile 1 = 88 % · max 17 (1 + 16)</span>
                <button type="button" className="dev-mosaic-tester__btn" onClick={() => bump(-1)} disabled={count <= 1}>
                    −
                </button>
                <span className="dev-mosaic-tester__count">{count}</span>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn"
                    onClick={() => bump(1)}
                    disabled={count >= MAX_SPEAKER_TOTAL}
                >
                    +
                </button>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost"
                    onClick={() => setCount(1)}
                >
                    1
                </button>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost"
                    onClick={() => setCount(3)}
                >
                    3
                </button>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost"
                    onClick={() => setCount(5)}
                >
                    5
                </button>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost"
                    onClick={() => setCount(9)}
                >
                    9
                </button>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost"
                    onClick={() => setCount(17)}
                >
                    17
                </button>
                <span className="dev-mosaic-tester__meta">rail {sidebarCount}/16</span>
            </header>

            <div className="dev-mosaic-tester__stage">
                <div className="recording-template__speaker">
                    <div className="recording-template__speaker-main">
                        <FakeVideoCell index={0} variant="speaker-main" />
                    </div>
                    <div className="recording-template__speaker-rail">
                        {Array.from({ length: sidebarCount }, (_, i) => (
                            <FakeVideoCell key={i + 1} index={i + 1} variant="speaker-sidebar" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

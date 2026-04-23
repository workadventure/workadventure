import { useCallback, useEffect, useState } from "react";
import { FakeVideoCell } from "./FakeVideoCell";

const STORAGE_KEY = "livekit-recording-template-dev-fullscreen-index";
/** Indices de flux factices pour simuler le changement de « participant mis en avant ». */
const MAX_FULLSCREEN_INDEX = 15;

function readInitialIndex(): number {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return 0;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
            return 0;
        }
        return Math.min(MAX_FULLSCREEN_INDEX, Math.max(0, n));
    } catch {
        return 0;
    }
}

/**
 * Outil de mise en page plein écran (une piste) avec flux factice.
 * Activer en dev : `npm run dev` puis `/?devFullscreen=1` (ou `npm run dev:fullscreen`).
 */
export function DevFullscreenTester(): JSX.Element {
    const [index, setIndex] = useState(readInitialIndex);

    useEffect(() => {
        document.title = "Dev · LiveKit fullscreen (WorkAdventure recording template)";
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, String(index));
        } catch {
            // ignore
        }
    }, [index]);

    const bump = useCallback((delta: number) => {
        setIndex((i) => Math.min(MAX_FULLSCREEN_INDEX, Math.max(0, i + delta)));
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
            <header className="dev-mosaic-tester__toolbar" aria-label="Contrôles plein écran de test">
                <strong className="dev-mosaic-tester__title">Fullscreen LiveKit (dev)</strong>
                <span className="dev-mosaic-tester__hint">
                    Touches + / − · une tuile factice (même zone que VideoTrack en prod)
                </span>
                <button type="button" className="dev-mosaic-tester__btn" onClick={() => bump(-1)} disabled={index <= 0}>
                    −
                </button>
                <span className="dev-mosaic-tester__count">{index + 1}</span>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn"
                    onClick={() => bump(1)}
                    disabled={index >= MAX_FULLSCREEN_INDEX}
                >
                    +
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setIndex(0)}>
                    1
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setIndex(2)}>
                    3
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setIndex(4)}>
                    5
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setIndex(8)}>
                    9
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setIndex(15)}>
                    16
                </button>
                <span className="dev-mosaic-tester__meta">slot {index + 1}/{MAX_FULLSCREEN_INDEX + 1}</span>
            </header>

            <div className="dev-mosaic-tester__stage">
                <div className="recording-template__livekit-fullscreen">
                    <FakeVideoCell key={index} index={index} variant="livekit-fullscreen" />
                </div>
            </div>
        </div>
    );
}

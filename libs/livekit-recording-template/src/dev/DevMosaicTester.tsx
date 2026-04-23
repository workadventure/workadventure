import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getMosaicLayoutPlan, MAX_MOSAIC_VIDEOS } from "../layout/mosaicLayoutPlans";
import { FakeVideoCell } from "./FakeVideoCell";

const STORAGE_KEY = "livekit-recording-template-dev-mosaic-count";

function readInitialCount(): number {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return 3;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
            return 3;
        }
        return Math.min(MAX_MOSAIC_VIDEOS, Math.max(0, n));
    } catch {
        return 3;
    }
}

/**
 * Outil de mise en page : tuiles factices, même grille que l’enregistrement.
 * Activer en dev : `npm run dev` puis `/?devMosaic=1` (ou `npm run dev:mosaic`). Speaker : `/?devSpeaker=1` / `npm run dev:speaker`.
 */
export function DevMosaicTester(): JSX.Element {
    const [count, setCount] = useState(readInitialCount);

    useEffect(() => {
        document.title = "Dev · mosaic grid (WorkAdventure recording template)";
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, String(count));
        } catch {
            // ignore
        }
    }, [count]);

    const plan = useMemo(() => {
        if (count < 1) {
            return null;
        }
        return getMosaicLayoutPlan(Math.min(count, MAX_MOSAIC_VIDEOS));
    }, [count]);

    const bump = useCallback((delta: number) => {
        setCount((c) => Math.min(MAX_MOSAIC_VIDEOS, Math.max(0, c + delta)));
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

    const gridStyle: CSSProperties | undefined = plan
        ? {
              display: "grid",
              gridTemplateColumns: plan.templateColumns,
              gridTemplateRows: plan.templateRows,
          }
        : undefined;

    return (
        <div className="dev-mosaic-tester recording-template">
            <header className="dev-mosaic-tester__toolbar" aria-label="Contrôles mosaïque de test">
                <strong className="dev-mosaic-tester__title">Mosaic (dev)</strong>
                <span className="dev-mosaic-tester__hint">Touches + / −</span>
                <button type="button" className="dev-mosaic-tester__btn" onClick={() => bump(-1)} disabled={count <= 0}>
                    −
                </button>
                <span className="dev-mosaic-tester__count">{count}</span>
                <button
                    type="button"
                    className="dev-mosaic-tester__btn"
                    onClick={() => bump(1)}
                    disabled={count >= MAX_MOSAIC_VIDEOS}
                >
                    +
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(0)}>
                    0
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(1)}>
                    1
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(3)}>
                    3
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(5)}>
                    5
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(8)}>
                    8
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(9)}>
                    9
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(12)}>
                    12
                </button>
                <button type="button" className="dev-mosaic-tester__btn dev-mosaic-tester__btn--ghost" onClick={() => setCount(16)}>
                    16
                </button>
                <span className="dev-mosaic-tester__meta">max {MAX_MOSAIC_VIDEOS} · flux canvas</span>
            </header>

            <div className="dev-mosaic-tester__stage">
                {!plan ? (
                    <div className="recording-template__mosaic recording-template__mosaic--empty dev-mosaic-tester__empty">
                        <p>0 tuile — clique sur + ou un préréglage (1, 3, 5, 8, 9, 12, 16).</p>
                    </div>
                ) : (
                    <div className="recording-template__mosaic" style={gridStyle}>
                        {plan.tiles.map((placement, index) => (
                            <FakeVideoCell key={index} index={index} placement={placement} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

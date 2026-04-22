import { useEffect, useRef } from "react";
import type { MosaicTilePlacement } from "../layout/mosaicLayoutPlans";

export type FakeVideoCellProps = {
    index: number;
    placement: MosaicTilePlacement;
};

const W = 1280;
const H = 720;

/**
 * Flux vidéo local de test (canvas + captureStream) pour valider object-fit / grille sans LiveKit.
 */
export function FakeVideoCell({ index, placement }: FakeVideoCellProps): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const rafRef = useRef(0);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx || !video) {
            return;
        }

        let stopped = false;
        const hue = (index * 47) % 360;
        const start = performance.now();

        const tick = (now: number): void => {
            if (stopped) {
                return;
            }
            const t = (now - start) / 1000;
            ctx.fillStyle = `hsl(${hue} 42% 30%)`;
            ctx.fillRect(0, 0, W, H);

            const barW = 160;
            const bx = (Math.sin(t * 1.1) * 0.5 + 0.5) * (W - barW);
            ctx.fillStyle = `hsl(${(hue + 100) % 360} 65% 52%)`;
            ctx.fillRect(bx, H * 0.58, barW, 28);

            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(32, 32, 220, 140);
            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 110px system-ui, sans-serif";
            ctx.fillText(String(index + 1), 52, 142);
            ctx.font = "26px system-ui, sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.fillText("dev · fake stream", 52, H - 36);

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        const stream = canvas.captureStream(30);
        video.srcObject = stream;
        void video.play().catch(() => {});

        return () => {
            stopped = true;
            cancelAnimationFrame(rafRef.current);
            stream.getTracks().forEach((tr) => tr.stop());
            const v = videoRef.current;
            if (v) {
                v.srcObject = null;
            }
        };
    }, [index]);

    return (
        <div
            className="recording-template__cell recording-template__cell--mosaic dev-mosaic-fake-cell"
            style={{
                gridColumn: placement.gridColumn,
                gridRow: placement.gridRow,
                minWidth: 0,
                minHeight: 0,
            }}
        >
            <video ref={videoRef} className="recording-template__video" muted playsInline autoPlay />
            <span className="dev-mosaic-fake-cell__badge" aria-hidden>
                {index + 1}
            </span>
        </div>
    );
}

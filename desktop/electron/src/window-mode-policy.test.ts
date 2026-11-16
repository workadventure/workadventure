import { describe, expect, test } from "vitest";
import {
    X11_RESTART_ARG,
    restartArgs,
    startupWindowModeAction,
    windowModeApplies,
    windowModeState,
} from "./window-mode-policy";

const wayland = { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" };
const plainStart = ["/opt/WorkAdventure/workadventure", "workadventure://play.example.com/@/org/world"];
const x11Restart = [...plainStart, "--ozone-platform=x11", X11_RESTART_ARG];

describe("windowModeApplies", () => {
    test("only on Linux under Wayland", () => {
        expect(windowModeApplies("linux", wayland)).toBe(true);
        expect(windowModeApplies("linux", { XDG_SESSION_TYPE: "x11" })).toBe(false);
        expect(windowModeApplies("darwin", wayland)).toBe(false);
    });
});

describe("windowModeState", () => {
    test("a plain start with X11 saved needs the restart", () => {
        expect(windowModeState({ saved: "x11", argv: plainStart, env: wayland, packaged: true })).toStrictEqual({
            saved: "x11",
            setByCommandLine: false,
            x11Unavailable: false,
            restartNeeded: true,
        });
    });

    test("the X11 restart runs the saved mode", () => {
        const state = windowModeState({ saved: "x11", argv: x11Restart, env: wayland, packaged: true });
        expect(state.restartNeeded).toBe(false);
        expect(state.setByCommandLine).toBe(false);
    });

    test("choosing Wayland from the X11 restart needs a restart", () => {
        expect(
            windowModeState({ saved: "wayland", argv: x11Restart, env: wayland, packaged: true }).restartNeeded
        ).toBe(true);
    });

    test("an --ozone-platform passed by hand decides instead", () => {
        const state = windowModeState({
            saved: "x11",
            argv: [...plainStart, "--ozone-platform=wayland"],
            env: wayland,
            packaged: true,
        });
        expect(state).toMatchObject({ setByCommandLine: true, restartNeeded: false });
    });

    test("without XWayland, X11 cannot start, so Wayland needs no restart", () => {
        const state = windowModeState({
            saved: "x11",
            argv: plainStart,
            env: { XDG_SESSION_TYPE: "wayland" },
            packaged: true,
        });
        expect(state).toMatchObject({ x11Unavailable: true, restartNeeded: false });
    });

    test("never restarts unpackaged (npm run dev)", () => {
        expect(windowModeState({ saved: "x11", argv: plainStart, env: wayland, packaged: false }).restartNeeded).toBe(
            false
        );
    });
});

describe("startupWindowModeAction", () => {
    const state = (argv: string[], saved: "x11" | "wayland" = "x11") =>
        windowModeState({ saved, argv, env: wayland, packaged: true });

    test("a plain start restarts in X11", () => {
        expect(
            startupWindowModeAction({
                applies: true,
                state: state(plainStart),
                argv: plainStart,
                x11StartPending: false,
            })
        ).toBe("restart-in-x11");
    });

    test("a plain start finding the last X11 start pending reports the failure instead", () => {
        expect(
            startupWindowModeAction({
                applies: true,
                state: state(plainStart),
                argv: plainStart,
                x11StartPending: true,
            })
        ).toBe("x11-failed");
    });

    test("the X11 restart itself does nothing, even if Wayland was chosen meanwhile", () => {
        expect(
            startupWindowModeAction({
                applies: true,
                state: state(x11Restart, "wayland"),
                argv: x11Restart,
                x11StartPending: true,
            })
        ).toBe("none");
    });

    test("nothing outside Linux under Wayland", () => {
        expect(
            startupWindowModeAction({
                applies: false,
                state: state(plainStart),
                argv: plainStart,
                x11StartPending: false,
            })
        ).toBe("none");
    });
});

describe("restartArgs", () => {
    test("keeps the user's arguments and adds X11's once", () => {
        expect(restartArgs(x11Restart, true)).toStrictEqual([
            ...plainStart.slice(1),
            "--ozone-platform=x11",
            X11_RESTART_ARG,
        ]);
    });

    test("drops X11's to let the next start decide", () => {
        expect(restartArgs(x11Restart, false)).toStrictEqual(plainStart.slice(1));
    });
});

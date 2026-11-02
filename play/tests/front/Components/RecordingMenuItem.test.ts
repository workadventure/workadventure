// @vitest-environment node

import type { RecordingData } from "@workadventure/messages";
import { render } from "svelte/server";
import { get, readable } from "svelte/store";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import RecordingMenuItem from "../../../src/front/Components/ActionBar/MenuIcons/RecordingMenuItem.svelte";
import type {
    RecordingMenuState,
    RecordingSpaceRow,
} from "../../../src/front/Components/ActionBar/MenuIcons/RecordingMenuUtils";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";
import { locale, setLocale } from "../../../src/i18n/i18n-svelte";
import { loadLocaleAsync } from "../../../src/i18n/i18n-util.async";

const context = vi.hoisted(() => {
    const room: { recording?: RecordingData } = {};
    return { room, isLogged: true };
});

vi.mock("../../../src/front/Components/ActionBar/ActionBarButton.svelte", async () => ({
    default: (await import("./RecordingActionBarButton.svelte")).default,
}));
vi.mock("../../../src/front/Components/Icons/RecordingIcon.svelte", () => ({ default: vi.fn() }));
vi.mock("../../../src/front/Components/Icons/RecordingActiveIcon.svelte", () => ({ default: vi.fn() }));
vi.mock("@wa-icons", () => ({ IconAlertTriangle: vi.fn() }));
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { currentStartedRoom: context.room },
}));
vi.mock("../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: { isLogged: () => context.isLogged },
}));
vi.mock("../../../src/front/Stores/RecordingStore", () => ({
    recordingStore: { setRequestState: vi.fn(), clearRequestState: vi.fn() },
}));
vi.mock("../../../src/front/Administration/AnalyticsClient", () => ({ analyticsClient: {} }));
vi.mock("../../../src/front/Utils/svelte-floatingui-show", () => ({ showFloatingUi: vi.fn() }));
vi.mock("../../../src/front/Stores/NotificationStore", () => ({ notificationPlayingStore: {} }));

const idleState: RecordingMenuState = {
    actionMode: "start",
    actionableRows: [],
    buttonState: "disabled",
    currentRows: [],
    directRow: undefined,
    hasActionableStart: false,
    hasOtherRecording: false,
    hasOwnRecording: false,
    hasPendingRequest: false,
    shouldDisplayButton: true,
};

describe("RecordingMenuItem tooltip", () => {
    const previousLocale = get(locale);

    beforeAll(async () => {
        await loadLocaleAsync("fr-FR");
        setLocale("fr-FR");
    });

    afterAll(() => {
        setLocale(previousLocale);
    });

    beforeEach(() => {
        context.isLogged = true;
        delete context.room.recording;
        vi.clearAllMocks();
    });

    it.each([undefined, { buttonState: "disabled", disabledReason: null } satisfies RecordingData])(
        "explains unavailable recording without claiming that one is active (policy %j)",
        (recording) => {
            context.room.recording = recording;

            const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(idleState) } });

            expect(body).toContain("Les enregistrements sont désactivés pour ce monde.");
            expect(body).not.toContain("Démarrer l'enregistrement");
            expect(body).not.toContain("Record.mp4");
            expect(body).not.toContain("Un enregistrement est en cours");
            expect(body).not.toContain("animate-pulse");
        },
    );

    it("preserves the reason supplied by the room policy", () => {
        context.room.recording = { buttonState: "disabled", disabledReason: "Recording unavailable for this account" };

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(idleState) } });

        expect(body).toContain(context.room.recording.disabledReason);
        expect(body).not.toContain("Démarrer l'enregistrement");
        expect(body).not.toContain("Record.mp4");
        expect(body).not.toContain("Un enregistrement est en cours");
    });

    it("asks an anonymous user to log in", () => {
        context.isLogged = false;

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(idleState) } });

        expect(body).toContain("Vous devez être connecté pour enregistrer.");
        expect(body).not.toContain("Démarrer l'enregistrement");
        expect(body).not.toContain("Record.mp4");
        expect(body).not.toContain("Un enregistrement est en cours");
    });

    it("announces a confirmed recording by another user", () => {
        context.room.recording = { buttonState: "disabled", disabledReason: "You cannot start a recording" };
        const state: RecordingMenuState = { ...idleState, hasOtherRecording: true };

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(state) } });

        expect(body).toContain("Un enregistrement est en cours");
        expect(body).toContain("animate-pulse");
        expect(body).not.toContain(context.room.recording.disabledReason);
    });

    it("warns participants before starting an available recording", () => {
        context.room.recording = { buttonState: "enabled", disabledReason: null };
        const row: RecordingSpaceRow = {
            action: "start",
            disabled: false,
            kind: "discussion",
            recorderName: null,
            recorderSpaceUserId: null,
            space: mock<SpaceInterface>(),
            spaceName: "discussion",
            status: "available",
        };
        const state: RecordingMenuState = {
            ...idleState,
            actionableRows: [row],
            currentRows: [row],
            hasActionableStart: true,
            buttonState: "normal",
        };

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(state) } });

        expect(body).toContain("Démarrer l'enregistrement");
        expect(body).toContain("Record.mp4");
        expect(body).toContain("Tous les participants seront notifiés que vous démarrez un enregistrement.");
        expect(body).not.toContain("Un enregistrement est en cours");
    });

    it("offers to stop the current user's confirmed recording", () => {
        const state: RecordingMenuState = { ...idleState, hasOwnRecording: true, actionMode: "stop" };

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(state) } });

        expect(body).toContain("Arrêter l'enregistrement");
        expect(body).toContain("Enregistrement en cours, cliquez pour l'arrêter.");
    });

    it.each([
        ["starting", "Démarrer l'enregistrement"],
        ["stopping", "Arrêter l'enregistrement"],
    ] as const)("describes a %s request without claiming it is already recording", (status, expectedAction) => {
        const row: RecordingSpaceRow = {
            action: null,
            disabled: true,
            kind: "discussion",
            recorderName: null,
            recorderSpaceUserId: null,
            space: mock<SpaceInterface>(),
            spaceName: "discussion",
            status,
        };
        const state: RecordingMenuState = {
            ...idleState,
            hasPendingRequest: true,
            hasOwnRecording: status === "stopping",
            currentRows: [row],
        };

        const { body } = render(RecordingMenuItem, { props: { recordingMenuState: readable(state) } });

        expect(body).toContain(`${expectedAction}...`);
        expect(body).not.toContain("Un enregistrement est en cours");
        expect(body).not.toContain("cliquez pour l'arrêter");
    });
});

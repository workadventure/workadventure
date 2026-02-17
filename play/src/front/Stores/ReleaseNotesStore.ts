import { writable, get } from "svelte/store";

const STORAGE_KEY = "workadventure-release-notes-seen";
const GITHUB_RELEASES_API = "https://api.github.com/repos/workadventure/workadventure/releases?per_page=1";

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string | null;
    html_url: string;
    published_at: string;
}

export interface ReleaseNotesState {
    release: GitHubRelease | null;
    loading: boolean;
    error: string | null;
    shouldShow: boolean;
}

function getSeenVersions(): string[] {
    if (typeof localStorage === "undefined") return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored) as unknown;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function markAsSeen(tagName: string): void {
    if (typeof localStorage === "undefined") return;
    const seen = getSeenVersions();
    if (!seen.includes(tagName)) {
        seen.push(tagName);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    }
}

function createReleaseNotesStore() {
    const { subscribe, set, update } = writable<ReleaseNotesState>({
        release: null,
        loading: false,
        error: null,
        shouldShow: false,
    });

    let fetchPromise: Promise<void> | null = null;

    const checkAndFetch = async (onboardingCompleted: boolean): Promise<void> => {
        if (!onboardingCompleted) return;

        const currentState = get({ subscribe });
        if (currentState.loading || currentState.release) return;

        if (fetchPromise) {
            await fetchPromise;
            return;
        }

        fetchPromise = (async () => {
            update((s) => ({ ...s, loading: true, error: null }));

            try {
                const response = await fetch(GITHUB_RELEASES_API, {
                    headers: {
                        Accept: "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                });

                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status}`);
                }

                const releases = (await response.json()) as GitHubRelease[];
                const latestRelease = releases[0];

                if (!latestRelease || !latestRelease.tag_name) {
                    update((s) => ({ ...s, loading: false }));
                    return;
                }

                const seenVersions = getSeenVersions();
                const alreadySeen = seenVersions.includes(latestRelease.tag_name);

                update((s) => ({
                    ...s,
                    release: latestRelease,
                    loading: false,
                    shouldShow: !alreadySeen && !!latestRelease.body?.trim(),
                }));
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to fetch release notes";
                update((s) => ({
                    ...s,
                    loading: false,
                    error: message,
                    shouldShow: false,
                }));
            } finally {
                fetchPromise = null;
            }
        })();

        await fetchPromise;
    };

    const dismiss = (tagName: string): void => {
        markAsSeen(tagName);
        update((s) => ({
            ...s,
            shouldShow: false,
            release: null,
        }));
    };

    const reset = (): void => {
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
        set({
            release: null,
            loading: false,
            error: null,
            shouldShow: false,
        });
    };

    return {
        subscribe,
        checkAndFetch,
        dismiss,
        reset,
    };
}

export const releaseNotesStore = createReleaseNotesStore();

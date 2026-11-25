import { get } from "svelte/store";
import { LL, locale } from "../../i18n/i18n-svelte";
import type { OnboardingItem } from "./onboardingRules";

/** `play/announcements/<version>/<locale>.md`, each in its own chunk, loaded when its announcement shows. */
const files = import.meta.glob<string>("/announcements/*/*.md", { query: "?raw", import: "default" });

/** The images and videos next to the notes, by path. Only their URLs are bundled: a file loads when its notes show. */
const media = import.meta.glob<string>("/announcements/*/*.{png,jpg,jpeg,gif,webp,avif,svg,mp4,webm}", {
    query: "?url",
    import: "default",
    eager: true,
});

/** `![Alt](file.webp)` and `![Alt](./file.webp)` point at a file of the release's folder, as built. */
function resolveMedia(markdown: string, version: string): string {
    return markdown.replace(/\]\((?:\.\/)?([^)\s]+)/g, (match: string, name: string) => {
        const url = media[`/announcements/${version}/${name}`];
        return url ? `](${url}` : match;
    });
}

/** The release notes of `version` in `lang`, or in English until they are translated. */
export function loadReleaseNotes(version: string, lang: string): Promise<string> {
    const load = files[`/announcements/${version}/${lang}.md`] ?? files[`/announcements/${version}/en-US.md`];
    if (!load) {
        return Promise.reject(new Error(`No release notes in play/announcements/${version}/en-US.md`));
    }
    return load().then((markdown) => resolveMedia(markdown, version));
}

/** The "what's new" of a release, written in `play/announcements/<version>/`. */
export function releaseNotes(version: string): OnboardingItem {
    const title = () => get(LL).onboarding.releaseNotes.title({ version });
    return {
        id: `wa.announcement.v${version}`,
        kind: "announcement",
        title,
        steps: [{ type: "modal", title, text: () => loadReleaseNotes(version, get(locale)) }],
    };
}

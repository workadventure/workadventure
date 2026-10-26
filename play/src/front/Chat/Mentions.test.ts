import { describe, expect, it } from "vitest";
import {
    createMentionPill,
    findMentionQuery,
    getMatrixMessageContent,
    getMentionedIds,
    markOwnMentions,
    mentionsToPlainText,
} from "./Mentions";

// What the composer's innerHTML holds once a member was picked.
const pill = (id: string, name: string) => createMentionPill({ id, name }).outerHTML;

describe("Mentions", () => {
    it("finds the name being typed after an @", () => {
        expect(findMentionQuery("hello @Yan")).toBe("Yan");
        expect(findMentionQuery("@")).toBe("");
        expect(findMentionQuery("hello @Yan")).toBe("Yan");
        expect(findMentionQuery("mail me at bob@example")).toBeUndefined();
        expect(findMentionQuery("@Yannis hello")).toBeUndefined();
    });

    it("sends a message without mentions as before, with an empty m.mentions", () => {
        expect(getMatrixMessageContent("hello")).toEqual({
            msgtype: "m.text",
            body: "hello",
            formatted_body: "hello",
            "m.mentions": {},
        });
    });

    it("sends the pills as m.mentions and matrix.to links, like Element", () => {
        const content = getMatrixMessageContent(
            `${pill("@bob:server", "Bob")} and ${pill("@alice:server", "Alice")}, **look**\nat ${pill("@bob:server", "Bob")}`,
        );

        expect(content).toEqual({
            msgtype: "m.text",
            body: "@Bob and @Alice, **look**\nat @Bob",
            format: "org.matrix.custom.html",
            formatted_body:
                '<p><a href="https://matrix.to/#/@bob:server">Bob</a> and <a href="https://matrix.to/#/@alice:server">Alice</a>, <strong>look</strong><br>at <a href="https://matrix.to/#/@bob:server">Bob</a></p>',
            "m.mentions": { user_ids: ["@bob:server", "@alice:server"] },
        });
    });

    it("reads the mentions of a message received from Element or from the proximity chat", () => {
        expect(
            getMentionedIds(
                '<a href="https://matrix.to/#/@bob:server">Bob</a> <a href="https://matrix.to/#/%40alice%3Aserver">Alice</a> <a href="https://example.com">a link</a>',
            ),
        ).toEqual(["@bob:server", "@alice:server"]);

        const spaceUserId = "http://play.localhost/_/global/maps.localhost/map.json?a=1&b=2_42";
        expect(getMentionedIds(`hi ${pill(spaceUserId, "Bob")}`)).toEqual([spaceUserId]);
    });

    it("turns the pills into plain text and flags the current user's ones", () => {
        const html = `${pill("@bob:server", "Bob")} <a href="https://matrix.to/#/@me:server">Me</a> <a href="https://example.com">a link</a>`;

        expect(mentionsToPlainText(html)).toBe("@Bob @Me a link");
        // What the composer leaves after a pill, and how it escapes what was typed.
        expect(mentionsToPlainText(`${pill("@bob:server", "Bob")}&nbsp;a &amp; b<br>c`)).toBe("@Bob a & b\nc");
        expect(markOwnMentions(html, "@me:server")).toBe(
            `${pill("@bob:server", "Bob")} <a data-mention-me href="https://matrix.to/#/@me:server">Me</a> <a href="https://example.com">a link</a>`,
        );
    });
});

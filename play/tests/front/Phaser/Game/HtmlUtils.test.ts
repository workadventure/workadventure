// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { HtmlUtils } from "../../../../src/front/WebRtc/HtmlUtils";

describe("urlify()", () => {
    it("should transform an url into a link", () => {
        const text = HtmlUtils.urlify("foo https://workadventu.re bar");
        expect(text).toEqual(
            'foo <a href="https://workadventu.re" target="_blank" style="">https://workadventu.re</a> bar'
        );
    });

    it("should not transform a normal text into a link", () => {
        const text = HtmlUtils.urlify("hello");
        expect(text).toEqual("hello");
    });

    it("should escape HTML", () => {
        const text = HtmlUtils.urlify("<h1>boo</h1>");
        expect(text).toEqual("&lt;h1&gt;boo&lt;/h1&gt;");
    });
});

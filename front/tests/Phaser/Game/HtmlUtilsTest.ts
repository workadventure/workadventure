import "jasmine";
import {HtmlUtils} from "../../../src/WebRtc/HtmlUtils";

describe("urlify()", () => {
    it("should transform an url into a link", () => {
        const text = HtmlUtils.urlify('https://google.com');
        expect(text).toEqual('<a href="https://google.com" target="_blank" style=":visited {color: white}">https://google.com</a>');
    });

    it("should not transform a normal text into a link", () => {
        const text = HtmlUtils.urlify('hello');
        expect(text).toEqual('hello');
    });
});
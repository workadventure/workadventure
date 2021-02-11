import "jasmine";
import {HtmlUtils} from "../../../src/WebRtc/HtmlUtils";

describe("urlify()", () => {
    // FIXME: we need to add PhantomJS to have a good mock for "document".
    /*it("should transform an url into a link", () => {
        const text = HtmlUtils.urlify('foo https://google.com bar');
        expect(text).toEqual('foo <a href="https://google.com" target="_blank" style=":visited {color: white}">https://google.com</a> bar');
    });

    it("should not transform a normal text into a link", () => {
        const text = HtmlUtils.urlify('hello');
        expect(text).toEqual('hello');
    });

    it("should escape HTML", () => {
        const text = HtmlUtils.urlify('<h1>boo</h1>');
        expect(text).toEqual('&lt;h1&gt;boo&lt;/h1&gt;');
    });*/
});

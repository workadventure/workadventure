import {describe, expect, it} from 'vitest';
import {DEFAULT_MIME_TYPE, mimeTypeManager} from "../src/Service/MimeType";

describe("MimeTypeManager", () => {
    describe("getExtensionByFileName", () => {
        it("should return a plain extension", () => {
            expect(mimeTypeManager.getExtensionByFileName("holidays.PNG")).toEqual("png")
        })

        it("should ignore a file name without extension", () => {
            expect(mimeTypeManager.getExtensionByFileName("holidays")).toBeUndefined()
        })

        it("should ignore an extension that is not alphanumeric", () => {
            expect(mimeTypeManager.getExtensionByFileName("poc.html/../../evil")).toBeUndefined()
            expect(mimeTypeManager.getExtensionByFileName("poc.ht ml")).toBeUndefined()
            expect(mimeTypeManager.getExtensionByFileName("poc.")).toBeUndefined()
        })

        it("should ignore an implausibly long extension", () => {
            expect(mimeTypeManager.getExtensionByFileName("poc.aaaaaaaaaaaaaaaaaaa")).toBeUndefined()
        })
    })

    describe("getSafeMimeTypeByFileName", () => {
        it("should keep image, audio and video types", () => {
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.png")).toContain("image/png")
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.mp3")).toContain("audio/mpeg")
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.mp4")).toContain("video/mp4")
        })

        it("should not serve active content types", () => {
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.html")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.htm")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.xhtml")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.xml")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.js")).toEqual(DEFAULT_MIME_TYPE)
        })

        it("should not serve svg as an image, it can embed a script", () => {
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.svg")).toEqual(DEFAULT_MIME_TYPE)
        })

        it("should fall back to a binary blob for unknown files", () => {
            // Temporary audio messages are stored under a bare uuid.
            expect(mimeTypeManager.getSafeMimeTypeByFileName("38fc160f-13cf-4864-ace6-9c3e03a9d3be"))
                .toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeTypeByFileName("a.unknownextension")).toEqual(DEFAULT_MIME_TYPE)
        })
    })

    describe("getSafeMimeType", () => {
        it("should not trust a client supplied content type", () => {
            expect(mimeTypeManager.getSafeMimeType("text/html")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeType("TEXT/HTML; charset=utf-8")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeType("image/svg+xml")).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeType(undefined)).toEqual(DEFAULT_MIME_TYPE)
            expect(mimeTypeManager.getSafeMimeType(false)).toEqual(DEFAULT_MIME_TYPE)
        })

        it("should keep a safe content type", () => {
            expect(mimeTypeManager.getSafeMimeType("image/png")).toEqual("image/png")
        })
    })
})

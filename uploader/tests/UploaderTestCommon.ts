import axios from "axios";
import {expect} from 'vitest';
import {uploadFile} from "./utils/uploadFile";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {download} from "./utils/download";

export interface UploadedFileResponse {
    id: string;
    location: string;
    path?: string;
}

export const XSS_PAYLOAD = '<!doctype html><script>alert("XSS same-origin " + document.domain)</script>';

/**
 * An uploaded HTML file must never be served back as HTML: a browser would run its script on the
 * uploader origin (which is the play origin on single domain setups).
 */
export async function uploadHtmlFileTest(uploaderUrl: string): Promise<UploadedFileResponse> {
    const response = await uploadFile<UploadedFileResponse[]>(
        `${uploaderUrl}/upload-file`,
        [{name: "poc.html", contents: XSS_PAYLOAD}]
    );

    expect(response.status).toBe(200)

    const data = response.data[0]
    const downloadResponse = await axios.get<string>(data.location)

    expect(downloadResponse.headers["content-type"]).toContain("application/octet-stream")
    expect(downloadResponse.headers["content-type"]).not.toContain("text/html")
    expect(downloadResponse.headers["content-disposition"]).toContain("attachment")
    // The file itself is stored and returned untouched, it is only served as an inert blob.
    expect(downloadResponse.data).toEqual(XSS_PAYLOAD)

    return data;
}

export async function uploadSingleFileTest(uploaderUrl: string): Promise<UploadedFileResponse> {
    const response = await uploadFile<UploadedFileResponse[]>(
        `${uploaderUrl}/upload-file`,
        [{name: "upload-subject1.txt", contents: "file contents"}]
    );

    expect(response.status).toBe(200)
    verifyResponseHeaders(response);

    const data = response.data[0]
    expect(data.location).toEqual(`${uploaderUrl}/upload-file/${data.id}`)

    expect(await download(data.location)).toEqual("file contents")
    return data;
}

export async function uploadMultipleFilesTest(uploaderUrl: string): Promise<UploadedFileResponse[]> {
    const response = await uploadFile<UploadedFileResponse[]>(
        `${uploaderUrl}/upload-file`, [
            {name: "upload-subject1.txt", contents: "first file contents"},
            {name: "upload-subject2.txt", contents: "second file contents"}
        ]);
    expect(response.data.length).toEqual(2)

    const file1 = response.data[0]
    expect(file1.location).toEqual(`${uploaderUrl}/upload-file/${file1.id}`)

    const file2 = response.data[1]
    expect(file2.location).toEqual(`${uploaderUrl}/upload-file/${file2.id}`)

    expect(await download(file1.location)).toEqual("first file contents")
    expect(await download(file2.location)).toEqual("second file contents")

    return response.data
}

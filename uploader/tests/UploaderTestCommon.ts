import {expect} from '@jest/globals';
import {uploadFile} from "./utils/uploadFile";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {download} from "./utils/download";
export async function uploadSingleFileTest(uploaderUrl: string) {
    const response = await uploadFile(
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

export async function uploadMultipleFilesTest(uploaderUrl: string) {
    const response = await uploadFile(
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

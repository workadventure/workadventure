import AdmZip from 'adm-zip';

export function createZipFromDirectory(directoryPath: string, zipFilePath: string): void {
    const zip = new AdmZip();

    zip.addLocalFolder(directoryPath);

    // Write the ZIP archive to disk
    zip.writeZip(zipFilePath);
}
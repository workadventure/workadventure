import { describe, it, expect, vi } from 'vitest';
import { GoogleDriveFileSystem } from '../src/Service/GoogleDriveStorage/GoogleDriveFileSystem';
import { GoogleDriveClient } from '../src/Service/GoogleDriveStorage/GoogleDriveClient';
import { Readable } from 'stream';
import * as unzipper from 'unzipper';

vi.mock('../src/Service/GoogleDriveStorage/GoogleDriveClient');

describe('GoogleDriveFileSystem', () => {
    it('should be true', () => {
        expect(true).toBe(true);
    });
});

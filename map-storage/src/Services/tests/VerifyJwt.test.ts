import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Create a mock module for environment variables
let mockPathPrefix: string | undefined = undefined;
const mockSecretKey = "test-secret-key";

// Mock environment variables BEFORE any imports that use them
vi.mock("../../Enum/EnvironmentVariable", () => ({
    get SECRET_KEY() {
        return mockSecretKey;
    },
    get PATH_PREFIX() {
        return mockPathPrefix;
    },
    API_URL: "http://api.test",
    AWS_ACCESS_KEY_ID: undefined,
    AWS_SECRET_ACCESS_KEY: undefined,
    AWS_DEFAULT_REGION: undefined,
    AWS_BUCKET: undefined,
    AWS_URL: undefined,
    S3_MAX_PARALLEL_REQUESTS: 10,
    S3_CONNECTION_TIMEOUT: 5000,
    S3_REQUEST_TIMEOUT: 5000,
    S3_UPLOAD_CONCURRENCY_LIMIT: 5,
    MAX_UNCOMPRESSED_SIZE: 10485760,
    USE_DOMAIN_NAME_IN_PATH: false,
    STORAGE_DIRECTORY: "/tmp/test",
    CACHE_CONTROL: "public, max-age=10",
    WEB_HOOK_URL: undefined,
    ENABLE_WEB_HOOK: false,
    WEB_HOOK_API_TOKEN: undefined,
}));

// Mock fileSystem
vi.mock("../../fileSystem", () => ({
    fileSystem: {
        readFileAsString: vi.fn(),
    },
}));

// Mock PathMapper to test verifyWam path mapping
vi.mock("../PathMapper", () => ({
    mapPathUsingDomainWithPrefix: vi.fn((filePath: string, domain: string) => {
        // Return a predictable path for testing
        return `${domain}${filePath}`;
    }),
}));

import { verifyJWT } from "../VerifyJwt";
import { fileSystem } from "../../fileSystem";
import { mapPathUsingDomainWithPrefix } from "../PathMapper";

describe("VerifyJwt - URL Reconstruction", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let sendMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    // Helper function to create a valid WAM file with a matching URL
    const createWamFile = (linkUrl: string) => {
        return JSON.stringify({
            version: "1.0",
            mapUrl: "http://example.com/map.wam",
            entityCollections: [],
            areas: [
                {
                    id: "test-area-id",
                    name: "test-area",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    visible: true,
                    properties: [
                        {
                            id: "prop-1",
                            type: "openFile",
                            name: "Test File",
                            link: linkUrl,
                        },
                    ],
                },
            ],
            entities: {},
        });
    };

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        mockPathPrefix = undefined;

        // Setup response mocks
        sendMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ send: sendMock });

        mockResponse = {
            status: statusMock,
        };

        mockNext = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mockPathPrefix = undefined;
    });

    describe("URL reconstruction without PATH_PREFIX", () => {
        it("should build correct URL when PATH_PREFIX is not set", async () => {
            mockPathPrefix = undefined;

            const expectedUrl = "http://example.com/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify the URL constructed should be http://example.com/uploads/test.pdf
            expect(fileSystem.readFileAsString).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it("should handle https protocol correctly", async () => {
            mockPathPrefix = undefined;

            const expectedUrl = "https://secure.example.com/uploads/secure.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "https://secure.example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/secure.pdf?token=" + token,
                protocol: "https",
                get: vi.fn().mockReturnValue("secure.example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            // Verify the URL constructed should use https://
            expect(fileSystem.readFileAsString).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("URL reconstruction with PATH_PREFIX", () => {
        it("should build correct URL with PATH_PREFIX set", async () => {
            mockPathPrefix = "/map-storage";

            const expectedUrl = "http://example.com/map-storage/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            // With PATH_PREFIX, the URL should include the prefix
            expect(fileSystem.readFileAsString).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle PATH_PREFIX without trailing slash", async () => {
            mockPathPrefix = "/prefix";

            const expectedUrl = "http://example.com/prefix/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle PATH_PREFIX with trailing slash", async () => {
            mockPathPrefix = "/prefix/";

            const expectedUrl = "http://example.com/prefix/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("x-forwarded-host header handling", () => {
        it("should use x-forwarded-host header when available as string", async () => {
            mockPathPrefix = undefined;

            const expectedUrl = "http://forwarded.example.com/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://forwarded.example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("original.example.com"),
                headers: {
                    "x-forwarded-host": "forwarded.example.com",
                },
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            // Should use forwarded host instead of req.get("host")
            expect(mockNext).toHaveBeenCalled();
            expect(fileSystem.readFileAsString).toHaveBeenCalled();
        });

        it("should use first value when x-forwarded-host is an array", async () => {
            mockPathPrefix = undefined;

            const expectedUrl = "http://first.example.com/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://first.example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("original.example.com"),
                headers: {
                    "x-forwarded-host": ["first.example.com", "second.example.com"],
                },
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            // Should use first host from array
            expect(mockNext).toHaveBeenCalled();
            expect(fileSystem.readFileAsString).toHaveBeenCalled();
        });

        it("should fallback to req.get('host') when x-forwarded-host is not present", async () => {
            mockPathPrefix = undefined;

            const expectedUrl = "http://default.example.com/uploads/test.pdf";

            const token = jwt.sign(
                {
                    wamUrl: "http://default.example.com/map.wam",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf?token=" + token,
                protocol: "http",
                get: vi.fn().mockReturnValue("default.example.com"),
                headers: {},
            };

            // Mock the WAM file to include the expected URL
            vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest.get).toHaveBeenCalledWith("host");
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Error handling", () => {
        it("should return 403 when token is missing", async () => {
            mockRequest = {
                query: {},
                url: "/uploads/test.pdf",
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should return 403 when token is invalid", async () => {
            mockRequest = {
                query: { token: "invalid-token" },
                url: "/uploads/test.pdf",
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should return 400 when JWT format is invalid", async () => {
            const token = jwt.sign(
                {
                    // Missing wamUrl
                    invalidField: "value",
                },
                mockSecretKey
            );

            mockRequest = {
                query: { token },
                url: "/uploads/test.pdf",
                protocol: "http",
                get: vi.fn().mockReturnValue("example.com"),
                headers: {},
            };

            await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});

describe("VerifyJwt - WAM Path Mapping", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let sendMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    const createWamFile = (linkUrl: string) => {
        return JSON.stringify({
            version: "1.0",
            mapUrl: "http://example.com/map.wam",
            entityCollections: [],
            areas: [
                {
                    id: "test-area-id",
                    name: "test-area",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    visible: true,
                    properties: [
                        {
                            id: "prop-1",
                            type: "openFile",
                            name: "Test File",
                            link: linkUrl,
                        },
                    ],
                },
            ],
            entities: {},
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockPathPrefix = undefined;

        sendMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ send: sendMock });

        mockResponse = {
            status: statusMock,
        };

        mockNext = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mockPathPrefix = undefined;
    });

    it("should call mapPathUsingDomainWithPrefix with correct wamUrl path and domain", async () => {
        mockPathPrefix = undefined;

        const wamUrl = "http://test.example.com/maps/map.wam";
        const expectedUrl = "http://test.example.com/uploads/file.pdf";

        const token = jwt.sign(
            {
                wamUrl: wamUrl,
            },
            mockSecretKey
        );

        mockRequest = {
            query: { token },
            url: "/uploads/file.pdf?token=" + token,
            protocol: "http",
            get: vi.fn().mockReturnValue("test.example.com"),
            headers: {},
        };

        vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

        await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

        // Verify that mapPathUsingDomainWithPrefix was called with the correct path and domain
        expect(mapPathUsingDomainWithPrefix).toHaveBeenCalledWith("/maps/map.wam", "test.example.com");
        expect(mockNext).toHaveBeenCalled();
    });

    it("should correctly map WAM URL path when PATH_PREFIX is set", async () => {
        mockPathPrefix = "/map-storage";

        const wamUrl = "http://test.example.com/map-storage/maps/map.wam";
        const expectedUrl = "http://test.example.com/map-storage/uploads/file.pdf";

        const token = jwt.sign(
            {
                wamUrl: wamUrl,
            },
            mockSecretKey
        );

        mockRequest = {
            query: { token },
            url: "/uploads/file.pdf?token=" + token,
            protocol: "http",
            get: vi.fn().mockReturnValue("test.example.com"),
            headers: {},
        };

        vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

        await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

        // mapPathUsingDomainWithPrefix should be called with the path from wamUrl
        // The PathMapper will handle PREFIX stripping internally (mocked in our tests)
        expect(mapPathUsingDomainWithPrefix).toHaveBeenCalledWith(
            "/map-storage/maps/map.wam",
            "test.example.com"
        );
        expect(mockNext).toHaveBeenCalled();
    });

    it("should handle different domains correctly", async () => {
        mockPathPrefix = undefined;

        const wamUrl = "http://domain1.com/maps/map.wam";
        const expectedUrl = "http://domain2.com/uploads/file.pdf";

        const token = jwt.sign(
            {
                wamUrl: wamUrl,
            },
            mockSecretKey
        );

        mockRequest = {
            query: { token },
            url: "/uploads/file.pdf?token=" + token,
            protocol: "http",
            get: vi.fn().mockReturnValue("domain2.com"),
            headers: {},
        };

        vi.mocked(fileSystem.readFileAsString).mockResolvedValue(createWamFile(expectedUrl));

        await verifyJWT(mockRequest as Request, mockResponse as Response, mockNext);

        // WAM URL uses domain1.com, but mapPathUsingDomainWithPrefix is called with domain from wamUrl
        expect(mapPathUsingDomainWithPrefix).toHaveBeenCalledWith("/maps/map.wam", "domain1.com");
        expect(mockNext).toHaveBeenCalled();
    });
});

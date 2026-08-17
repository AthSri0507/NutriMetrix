/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/__tests__", "<rootDir>/src"],
    testMatch: ["**/*.test.ts", "**/*.test.tsx"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/index.ts",
    ],
    coverageDirectory: "coverage",
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    strict: true,
                    esModuleInterop: true,
                    moduleResolution: "node",
                    types: ["jest"],
                },
            },
        ],
    },
};

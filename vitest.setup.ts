/**
 * Vitest setup file to mock server-only and handle Next.js-specific modules in tests.
 * This allows test environments to import modules that use "server-only" without errors.
 */

import { vi } from "vitest";

// Mock the server-only module to prevent import errors in test environments
vi.mock("server-only", () => ({}));

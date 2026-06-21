import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export const testEnvironment = "node";
export const transform = {
  ...tsJestTransformCfg,
};
export const resolver = "ts-jest-resolver";
export const restoreMocks = true;
export const resetMocks = true;
export const clearMocks = true;

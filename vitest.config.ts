import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const fileEnv = loadEnv("development", process.cwd(), "");

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: { ...fileEnv },
  },
});

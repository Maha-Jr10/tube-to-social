import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Get your project ref from: cloud.trigger.dev → your project → Settings
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  runtime: "node",
  logLevel: "log",
  maxDuration: 600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 5000,
      maxTimeoutInMs: 30000,
    },
  },
  dirs: ["src/trigger"],
});

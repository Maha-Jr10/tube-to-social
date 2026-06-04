import {
  defineConfig
} from "./chunk-O2EOSSNY.mjs";
import "./chunk-QKPJMX6P.mjs";
import {
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
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
      minTimeoutInMs: 5e3,
      maxTimeoutInMs: 3e4
    }
  },
  dirs: ["src/trigger"],
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map

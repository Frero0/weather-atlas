import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
function pwa(base: string): Plugin {
  let out = "dist";
  return {
    name: "weather-atlas-pwa",
    apply: "build",
    configResolved(c) {
      out = c.build.outDir;
      base = c.base;
    },
    closeBundle() {
      const files = (dir: string): string[] =>
        readdirSync(resolve(out, dir), { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? files(dir + e.name + "/") : [dir + e.name],
        );
      const assets = files("").filter((f) => f !== "serviceworker.js");
      const revision = createHash("sha256")
        .update(assets.map((f) => readFileSync(resolve(out, f))).join(""))
        .digest("hex")
        .slice(0, 12);
      const source = readFileSync("scripts/serviceworker.js", "utf8")
        .replace("__REVISION__", revision)
        .replace("__ASSETS__", JSON.stringify(assets.map((f) => base + f)));
      writeFileSync(resolve(out, "serviceworker.js"), source);
      writeFileSync(
        resolve(out, "manifest.webmanifest"),
        JSON.stringify({
          id: base,
          name: "Weather Atlas",
          short_name: "Weather Atlas",
          description: "Weather for the places that matter.",
          lang: "en",
          start_url: base,
          scope: base,
          display: "standalone",
          background_color: "#eef3f7",
          theme_color: "#214e86",
          icons: [
            {
              src: base + "icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: base + "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: base + "icon-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        }),
      );
    },
  };
}
export default defineConfig(({ mode }) => {
  const base = loadEnv(mode, ".", "").BASE_PATH || "/";
  return {
    base,
    plugins: [react(), pwa(base)],
    build: { chunkSizeWarningLimit: 650 },
  };
});

import { build } from "esbuild";
import packageInfo from "./package.json" with { type: "json" };
import tsConfig from "./tsconfig.json" with { type: "json" };

const userscriptHeader = `// ==UserScript==
// @name highlight-smokedetector-matches
// @version ${packageInfo.version}
// @author ${packageInfo.author.name}
// @description Highlights the actual SmokeDetector matches in Metasmoke records
// @namespace https://getzit.net
// @downloadURL https://raw.githubusercontent.com/talflon/highlight-smokedetector-matches/main/highlight-smokedetector-matches.user.js
// @supportURL  https://github.com/talflon/highlight-smokedetector-matches/issues
// @match *://metasmoke.erwaysoftware.com/post/*
// @grant none
// @run-at document-end
// @noframes
// ==/UserScript==`;

await build({
  entryPoints: ["src/userscript.ts"],
  bundle: true,
  banner: { js: userscriptHeader },
  outfile: "highlight-smokedetector-matches.user.js",
  target: tsConfig.target,
});

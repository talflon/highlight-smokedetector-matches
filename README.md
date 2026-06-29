# highlight-smokedetector-matches

Small library, and eventually userscript, for highlighting the actual SmokeDetector matches in Metasmoke records.

**_Still under construction!_**

## Test webapp

1. Add an Metasmoke key to `src/config.ts`
2. Run `npm run compile`
3. Host `tester.html` and the `/dist/` directory
4. Type a Metasmoke post ID into the field and press **Load**.

## Current goals

- Show highlighting of blacklist source code matches on Metasmoke `/posts/<ID>` pages
- Add some way to see highlighting of blacklist source code matches in FIRE popup
- Show (best-effort) highlighting in rendered preview on Metasmoke `/posts/<ID>` pages
- Show (best-effort) highlighting in rendered preview on FIRE popup
- Be resilient to whatever the "why" reasons throw at us

### Potential expansion

- Highlight some non-blacklist entries with a different color
- Highlight text which matched more than one thing with a different color
- Mouseover tooltip explanation of what matched
- Option to highlight based on current blacklists instead of what matched when the post was reported

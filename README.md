# highlight-smokedetector-matches

Small library and userscript for highlighting the actual SmokeDetector matches in Metasmoke records.

**_Still under construction!_**

Currently it will show highlighting of blacklist source code matches on Metasmoke `/posts/<ID>` pages.

[Click here to install or download](https://raw.githubusercontent.com/talflon/highlight-smokedetector-matches/main/highlight-smokedetector-matches.user.js)

## Development

You should be able to rebuild the userscript from its Typescript sources with:

```
$ npm install
$ npm run build
```

If instead you run `npm run build dev`, it will create a `.dev.user.js` userscript
which does extra logging and display for debugging purposes.

### Tester webapp

Included is a small webapp for loading posts directly from the Metasmoke API and displaying them with highlighting. To use it:

1. Add an Metasmoke key to `src/config.ts`
2. Run `npm run compile`
3. Host `tester.html` and the `/dist/` directory
4. Type a Metasmoke post ID into the field and press **Load**.

## Current goals

- Add some way to see highlighting of blacklist source code matches in FIRE popup
- Show (best-effort) highlighting in rendered preview on Metasmoke `/posts/<ID>` pages
- Show (best-effort) highlighting in rendered preview on FIRE popup
- Be resilient to whatever the "why" reasons throw at us

### Potential expansion

- Highlight some non-blacklist entries with a different color
- Highlight text which matched more than one thing with a different color
- Mouseover tooltip explanation of what matched
- Option to highlight based on current blacklists instead of what matched when the post was reported

# Murchalka Web

Accessible React and TypeScript browser shell for the shared Phase 7 Client Runtime and authenticated realtime module.

## Development

```shell
npm ci
npm run dev
```

Open the URL printed by Vite. Do not open `index.html` through `file://`; browser modules and compiled styles require an HTTP server.

`npm run check` performs strict TypeScript validation, unit tests, and the production Vite build. The shell accepts only explicit loopback Runtime/realtime endpoints. Mini App behavior is supplied exclusively by the vendored, content-addressed `@murchalka/client-runtime` package; this shell contains no feature-specific extension logic.

`npx playwright test e2e/phase7.spec.ts` proves signed activation, metered WASM rendering, server-action delegation, unsupported-target fallback, corrupt/unsigned rollback, disable rendering, and verified offline cache reuse in Chromium.

Canonical `vX.Y.Z` tags publish the compiled static application, an immutable GitHub Release, provenance attestation, and a versioned GHCR image.

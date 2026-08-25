# Murchalka Web

Accessible React and TypeScript browser shell for the Phase 5 Client Runtime and authenticated realtime module.

## Development

```shell
npm ci
npm run dev
```

Open the URL printed by Vite. Do not open `index.html` through `file://`; browser modules and compiled styles require an HTTP server.

`npm run check` performs strict TypeScript validation, unit tests, and the production Vite build. The shell accepts only the explicit Phase 5 loopback realtime endpoint and renders the standard fallback for a compatible declarative Agent UI document.

Canonical `vX.Y.Z` tags publish the compiled static application, an immutable GitHub Release, provenance attestation, and a versioned GHCR image.

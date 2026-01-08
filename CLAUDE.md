# Breev

A Tauri v2 + SvelteKit daily life summary app.

## Auto-Updater Setup

The app uses Tauri's updater plugin with GitHub Releases.

### Release Process

```bash
# 1. Bump version in all three files:
#    - package.json
#    - src-tauri/Cargo.toml
#    - src-tauri/tauri.conf.json

# 2. Commit, tag, and push
git add . && git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

GitHub Actions builds for macOS (arm64 + x86_64) and creates a draft release with `latest.json`.

## Tech Stack

- Frontend: SvelteKit + Svelte 5, Vite
- Backend: Tauri v2, Rust
- Package manager: Bun

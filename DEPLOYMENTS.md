# SecureAnno Release Record

This file keeps a dated record of live snapshots so you can jump back to a known-good version fast.

## Current Live Snapshot

- Date: `2026-06-28`
- Tag: `live-2026-06-28`
- Commit: `73c332d`
- Status: `Live`
- Notes: `SecureAnno homepage and VPS deployment flow synced`

## Restore Flow

To move the repo or VPS back to a saved version:

```bash
git fetch --tags
git checkout live-2026-06-28
```

If you want to keep working after checking out the snapshot, create a branch from it:

```bash
git checkout -b restore-live-2026-06-28 live-2026-06-28
```

## Snapshot Flow

Create a new dated snapshot before or after a change:

```bash
npm run release:snapshot -- --note "Short note about the change"
git push origin main --tags
```

The helper updates this file and creates an annotated git tag for the current commit.

## History

| Date | Tag | Commit | Status | Note |
| --- | --- | --- | --- | --- |
| 2026-06-28 | `live-2026-06-28` | `73c332d` | Live | SecureAnno homepage and VPS deployment flow synced |


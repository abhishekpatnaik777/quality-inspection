#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Format check (Prettier)"
npm run format:check

echo "==> Lint (oxlint)"
npm run lint

echo "==> Unit tests"
npm test

echo "==> Dependency audit (npm audit)"
npm run audit

echo "Pre-commit checks passed."

# Tests Directory

All automated tests should live under `tests/` to keep them separated from production business logic.

Recommended layout:

- `tests/unit/` for unit tests
- `tests/integration/` for integration tests
- `tests/e2e/` for end-to-end tests (if used)

Current API route tests:

- `tests/unit/api/resumes-pdf.route.test.ts`
- `tests/unit/api/share-uuid.route.test.ts`

Current unit API route coverage:

- `tests/unit/api/analyze.route.test.ts`
- `tests/unit/api/jd-match.route.test.ts`
- `tests/unit/api/profile-avatar.route.test.ts`
- `tests/unit/api/profile.route.test.ts`
- `tests/unit/api/resumes-id.route.test.ts`
- `tests/unit/api/resumes-pdf.route.test.ts`
- `tests/unit/api/resumes.route.test.ts`
- `tests/unit/api/share-uuid.route.test.ts`
- `tests/unit/api/share.route.test.ts`
- `tests/unit/api/stats.route.test.ts`

Current Playwright API e2e coverage:

- `tests/e2e/api/analyze.spec.ts`
- `tests/e2e/api/jd-match.spec.ts`
- `tests/e2e/api/profile-avatar.spec.ts`
- `tests/e2e/api/profile.spec.ts`
- `tests/e2e/api/resume-id.spec.ts`
- `tests/e2e/api/resume-pdf.spec.ts`
- `tests/e2e/api/resumes.spec.ts`
- `tests/e2e/api/share-uuid.spec.ts`
- `tests/e2e/api/share.spec.ts`
- `tests/e2e/api/stats.spec.ts`

Current Playwright page e2e coverage:

- `tests/e2e/pages/analysis.spec.ts`
- `tests/e2e/pages/edit.spec.ts`
- `tests/e2e/pages/jd-match.spec.ts`

## Running

Unit tests:

```bash
npx vitest run tests/unit/api
```

Type-check tests and app:

```bash
npx tsc --noEmit
```

List Playwright API tests:

```bash
npx playwright test tests/e2e/api --list
```

Run Playwright API tests:

```bash
npx playwright test tests/e2e/api
```

## E2E Environment Variables

Authenticated Playwright tests are designed to skip automatically when required env vars are missing.

Common auth:

- `E2E_AUTH_TOKEN` (optional; global setup will auto-generate if absent)
- `E2E_EMAIL` (optional; defaults to an auto-managed E2E user)
- `E2E_PASSWORD` (optional; defaults to an auto-managed E2E password)

AI-backed tests additionally require:

- `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`

Notes:

- API e2e tests now create and clean up their own temporary resume/share data.
- Page e2e tests currently use UI login plus API-seeded resume fixtures.
- Playwright `globalSetup` will create/update a dedicated Supabase E2E user and write auth state to `tests/.auth/e2e-user.json`.

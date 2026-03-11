# Tests Directory

All automated tests should live under `tests/` to keep them separated from production business logic.

Recommended layout:

- `tests/unit/` for unit tests
- `tests/integration/` for integration tests
- `tests/e2e/` for end-to-end tests (if used)

Current API route tests:

- `tests/unit/api/resumes-pdf.route.test.ts`
- `tests/unit/api/share-uuid.route.test.ts`

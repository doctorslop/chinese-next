# Project Improvement Evaluation

**Project**: Chinese Dictionary (chinese-next)
**Date**: 2026-02-16
**Current State**: Production-ready Next.js 16 / React 19 / TypeScript / SQLite dictionary app

---

## Executive Summary

The project is a well-structured Chinese-English dictionary with clean architecture, modern tech stack, and solid core functionality. The codebase passes lint and type checks cleanly with zero warnings. Key improvement opportunities fall into three tiers: **critical gaps** (testing, CI/CD), **high-value enhancements** (performance, accessibility, search quality), and **polish items** (code organization, developer experience).

---

## 1. Critical Gaps

### 1.1 No Test Suite

**Impact**: High | **Effort**: Medium

There are zero tests in the project — no unit tests, integration tests, or end-to-end tests. This is the single largest risk factor for ongoing development.

**What to add**:
- **Unit tests** for `lib/search.ts` (query parsing, condition building, relevance ordering), `lib/pinyin.ts` (tone conversion, normalization, detection), and `lib/parser.ts` (CC-CEDICT parsing)
- **API route tests** for `/api/search` (rate limiting, input validation, edge cases)
- **Component tests** for `FlashcardStudy` (keyboard shortcuts, shuffle, navigation state)
- **Integration tests** for end-to-end search flows with a test SQLite database

**Recommended tooling**: Vitest (fast, native ESM/TypeScript support, Next.js compatible) + React Testing Library for components.

### 1.2 No CI/CD Pipeline

**Impact**: High | **Effort**: Low

No `.github/workflows` directory exists. Every merge to main is unvalidated.

**What to add**:
- GitHub Actions workflow for: lint, type-check, and test on every PR
- Build verification (ensure `next build` succeeds)
- Optional: automated deployment trigger on merge to main

### 1.3 No Error Monitoring

**Impact**: Medium | **Effort**: Low

The `app/error.tsx` error boundary exists but errors are only logged to `console.error`. In production, search failures and database errors would be invisible.

**What to add**: Structured error logging or integration with an error reporting service. Even a simple server-side log file would be an improvement over console-only output.

---

## 2. High-Value Enhancements

### 2.1 FTS5 Is Configured But Unused for Search

**Impact**: High | **Effort**: Medium

The database creates an FTS5 virtual table (`entries_fts`) with sync triggers (`lib/db.ts:67-100`), but the search engine (`lib/search.ts`) never queries it. All searches use `LIKE` patterns against the main `entries` table. This means:

- The FTS5 table consumes disk space and write overhead (insert/update/delete triggers) for no benefit
- English definition searches (`LIKE '%term%'`) do full table scans instead of using the FTS5 index
- Multi-word English queries cannot leverage ranked full-text search

**Options**:
1. **Use FTS5 for English searches**: Replace `definition LIKE '%term%'` with `entries_fts MATCH ?` for English-detected queries. This would dramatically improve performance for English search terms.
2. **Remove FTS5 entirely**: If LIKE-based search is sufficient, removing the FTS5 table and triggers would reduce database size and simplify the schema.
3. **Hybrid approach**: Use FTS5 for English/pinyin text search; keep LIKE for Chinese character exact matching (where FTS5 doesn't help as much).

### 2.2 `formatEntry` Function Is Duplicated

**Impact**: Low | **Effort**: Low

The `formatEntry` function appears with identical logic in both `app/search/page.tsx:19-37` and `app/api/search/route.ts:52-70`. This should be extracted to a shared module (e.g., `lib/format.ts`) to avoid drift.

### 2.3 Word Set Cache Is Never Invalidated

**Impact**: Low | **Effort**: Low

In `lib/search.ts:574-590`, the `_wordSet` used for Chinese text segmentation is cached permanently as a module-level `Set`. If the database is ever re-imported while the server is running, the cache will be stale. Consider either:
- Clearing `_wordSet = null` in `importEntries()`
- Using a cache with a TTL or version check

### 2.4 Rate Limiter Memory Leak Potential

**Impact**: Low | **Effort**: Low

The rate limiter in `app/api/search/route.ts:17-38` uses a `Map` with 5-minute cleanup intervals. Under heavy load with many unique IPs, the map could grow substantially between cleanups. Consider:
- Using a sliding window or token bucket algorithm
- Reducing the cleanup interval
- Capping the map size

### 2.5 CSS Is a Single 1353-Line File

**Impact**: Medium | **Effort**: Medium

All styles live in `app/globals.css`. While this works, it makes it harder to reason about component-specific styles. As the app grows, consider:
- CSS Modules (`.module.css` files per component) — supported natively by Next.js
- This would enable tree-shaking of unused styles and prevent class name collisions

### 2.6 Search Relevance Could Be Improved

**Impact**: Medium | **Effort**: Medium

Current ordering logic in `lib/search.ts:252-288` only considers the first include token for relevance. Multi-term searches (e.g., "big red") get suboptimal ordering. Additionally:
- English searches could weight word-boundary matches higher than substring matches
- Definition length is used as a proxy for relevance, but frequency data (if available from CC-CEDICT or HSK levels) would be more accurate
- The `isSimilar` function (`search.ts:476-493`) uses a naive character-position comparison that misses common edit-distance patterns

---

## 3. Accessibility & SEO

### 3.1 Missing ARIA Landmarks

**Impact**: Medium | **Effort**: Low

- The search form lacks `role="search"` or `<form role="search">`
- Dictionary entries have no semantic `<article>` or `<dl>` (definition list) markup
- The flashcard interface lacks `aria-live` regions for screen reader announcements when cards change

### 3.2 Missing `<meta>` Tags for SEO

**Impact**: Low | **Effort**: Low

- No Open Graph tags (`og:title`, `og:description`, `og:image`) for social sharing
- Search result pages could include structured data (JSON-LD) for dictionary entries
- The `<meta name="description">` is generic ("Chinese-English Dictionary") — could be dynamic per page

### 3.3 Keyboard Focus Management

**Impact**: Medium | **Effort**: Low

- When navigating between flashcards, focus isn't explicitly managed — screen reader users may not know the card changed
- The pagination links lack `aria-label` attributes (e.g., "Go to page 2")
- The audio play buttons in `AudioLink.tsx` should indicate loading/playing state

---

## 4. Performance

### 4.1 Word Set Loads All Entries Into Memory

**Impact**: Medium | **Effort**: Medium

`getWordSet()` in `search.ts:577-590` loads every `traditional` and `simplified` value from the entire database into a JavaScript `Set`. With ~120K entries, this is ~240K strings in memory. This could be replaced with:
- A SQLite `EXISTS` subquery during segmentation (trading CPU for memory)
- A Bloom filter for fast membership testing with much lower memory usage
- Lazy loading only when segmentation is actually needed (it's already lazy, but loads everything at once)

### 4.2 Service Worker Cache Versioning

**Impact**: Low | **Effort**: Low

The service worker uses static cache names (`chinese-dict-v1`, `chinese-dict-static-v1`). When deploying updates, the cache version must be manually bumped. Consider generating cache names from the build hash, or using the Next.js build ID.

### 4.3 No Response Caching Headers

**Impact**: Medium | **Effort**: Low

The API route (`/api/search`) returns no `Cache-Control` headers. For identical queries, the browser always makes a fresh server request. Adding short-lived cache headers (e.g., `Cache-Control: public, max-age=60`) for search results would reduce server load for repeated queries.

---

## 5. Developer Experience

### 5.1 No Development Database Seeding

**Impact**: Medium | **Effort**: Low

New developers must run `npm run import` with the full 9.6MB CC-CEDICT file before the app works. There's no:
- Small sample dataset for quick development/testing
- Seed script that creates a minimal database
- Error handling when the database doesn't exist (the app just crashes)

### 5.2 No `npm run typecheck` Script

**Impact**: Low | **Effort**: Trivial

While `npm run lint` exists, there's no script to run `tsc --noEmit`. Adding this would make it easy to run type checks independently and include them in CI.

### 5.3 Missing `.nvmrc` or `engines` Field

**Impact**: Low | **Effort**: Trivial

No Node.js version constraint is specified. Since the project uses Next.js 16 (which requires Node 18.18+) and native `better-sqlite3`, pinning the Node version would prevent compatibility issues.

---

## 6. Security Refinements

### 6.1 SQL Injection Surface

**Impact**: Medium | **Effort**: Low

While the search engine uses parameterized queries (good), the SQL column names in `buildCondition()` (`search.ts:117-134`) are determined by auto-detection logic rather than user input. This is safe today, but the field-name interpolation pattern (`${f} LIKE ?`) is a code smell that could become vulnerable if field names are ever derived from user input in the future. Consider using a whitelist/map approach for column names.

### 6.2 Missing Content-Security-Policy Header

**Impact**: Medium | **Effort**: Low

The security headers in `next.config.ts` include `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, but no `Content-Security-Policy`. Adding a CSP would protect against XSS attacks. A basic policy:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'
```

Note: The inline `<script>` tags in `layout.tsx` (theme detection, service worker registration) require `'unsafe-inline'` or nonce-based CSP.

### 6.3 Rate Limiter Trusts `x-forwarded-for`

**Impact**: Low | **Effort**: Low

The rate limiter uses `x-forwarded-for` header for IP identification (`route.ts:74`). This header is trivially spoofable unless the app is behind a trusted reverse proxy. If deployed directly, consider using the socket IP instead, or validating the `x-forwarded-for` chain against known proxy IPs.

---

## 7. Prioritized Recommendation

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| 1 | Add test suite (Vitest + RTL) | High | Medium |
| 2 | Add CI/CD pipeline (GitHub Actions) | High | Low |
| 3 | Use FTS5 for English search or remove it | High | Medium |
| 4 | Add Content-Security-Policy header | Medium | Low |
| 5 | Extract shared `formatEntry` to `lib/format.ts` | Low | Low |
| 6 | Add accessibility improvements (ARIA) | Medium | Low |
| 7 | Add `typecheck` npm script + `.nvmrc` | Low | Trivial |
| 8 | Add response caching headers to API | Medium | Low |
| 9 | Create dev seed database | Medium | Low |
| 10 | Consider CSS Modules migration | Medium | Medium |

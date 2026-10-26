# Slug-Based Selector Support for the PLN EMI API

## Summary

Extend the backend API so the landing app can use category slugs in article and
commitment filters, and localized division slugs in service-page anchors. Keep
existing numeric-ID filters and ID-based admin endpoints working. Update the
admin client to manage commitment-category and division-content slugs.

## API and Data Changes

- Add `article_category_slug` to `GET /articles` and
  `document_commitment_category_slug` to `GET /document_commitments`. Keep the
  existing ID filters; reject requests that provide both forms for the same
  filter. Unknown slugs return an empty page, never an unfiltered list. Apply
  slug filters consistently to results and pagination counts.
- Article categories already store and return a slug; leave their data model
  unchanged.
- Add a unique, required `slug` to commitment categories. Include it in category
  list/detail responses and nested document category objects. Require it on
  create and allow explicit updates.
- Add a localized `slug` to each division content translation. Include it in
  public and admin division responses. Require it when creating a translation;
  allow it to be updated with that translation's `language_id`. Enforce
  uniqueness per language.
- Keep category and division create/update/delete endpoints ID-based. Division
  slugs are for localized service-page anchors; no slug lookup endpoint is
  needed.
- Add database migrations for commitment-category and division-content slugs.
  Backfill from existing names using deterministic lowercase, hyphenated slugs;
  use the record ID to resolve collisions and stable ID-based fallbacks when a
  name produces no slug. Then enforce non-null and uniqueness constraints.
- Update `pln-emi-admin` DTOs and forms to submit explicit commitment-category
  slugs and per-language division slugs. Surface duplicate-slug conflicts in
  the admin UI.
- Update API docs, OpenAPI request schemas, and Postman examples with the new
  query parameters, response fields, validation, and error behavior.

## Rollout

Deploy the admin changes so category and division forms send explicit slugs
before deploying API validation that requires them. Requests that omit a slug
when creating a category or division, or when adding a division translation,
return `400 Bad Request`. Numeric-ID list filters remain available for existing
API clients.

## Test Plan

- Verify both new filters, their interaction with page, search, status, and
  pagination filters, and unchanged ID-filter behavior.
- Verify ID-plus-slug requests return `400`; unknown slugs return an empty page.
- Verify commitment-category slugs appear in all relevant responses; duplicate
  create/update slugs return `409`.
- Verify division slugs are returned per language, can differ across
  languages, and duplicates in one language return `409`.
- Verify the migration backfills existing records without collisions or data
  loss.
- Run the server's `pnpm test`, `pnpm lint`, and `pnpm build`; run the admin
  repository's supported checks.

## Assumptions

- The landing app will later change its filter URLs to `?category=<slug>` and
  service anchors to a slug-based fragment; that UI change is outside this API
  plan.
- A renamed category or translation keeps its current slug unless an admin
  explicitly changes it. Unknown or retired slugs produce empty filter results.

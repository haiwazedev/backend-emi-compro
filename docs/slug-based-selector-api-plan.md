# Slug-Based Selector Support for the PLN EMI API

## Summary

The API supports category slugs in article and commitment filters, and
localized division slugs in service-page anchors. Numeric-ID filters and
ID-based admin endpoints remain available. Commitment category slugs are
localized with their names.

## API and Data Changes

- Add `article_category_slug` to `GET /articles` and
  `document_commitment_category_slug` to `GET /document_commitments`. Keep the
  existing ID filters; reject requests that provide both forms for the same
  filter. Unknown slugs return an empty page, never an unfiltered list. Apply
  slug filters consistently to results and pagination counts.
- Article categories already store and return a slug; leave their data model
  unchanged.
- Store commitment category `name` and `slug` in
  `document_commitment_category_contents` with `language_id`. Include the
  selected translation in category lists and all translations in details.
  Slugs are unique within a language; the same slug may be used in another
  language.
- Add a localized `slug` to each division content translation. Include it in
  public and admin division responses. Require it when creating a translation;
  allow it to be updated with that translation's `language_id`. Enforce
  uniqueness per language.
- Keep category and division create/update/delete endpoints ID-based. Division
  slugs are for localized service-page anchors; no slug lookup endpoint is
  needed.
- Backfill existing commitment category names and slugs into the `id`
  translation. Backfill division-content slugs from existing names using
  deterministic lowercase, hyphenated slugs; use the record ID to resolve
  collisions and stable ID-based fallbacks when a name produces no slug.
- Update `pln-emi-admin` DTOs and forms to submit explicit commitment-category
  slugs and per-language division slugs. Surface duplicate-slug conflicts in
  the admin UI.
- Update API docs, OpenAPI request schemas, and Postman examples with the new
  query parameters, response fields, validation, and error behavior.

## Rollout

Category create requests require `language_id`, `name`, and `slug`, and the
first translation must use `id`. Division create and translation requests
require localized slugs. Numeric-ID list filters remain available for existing
API clients.

## Test Plan

- Verify both new filters, their interaction with page, search, status, and
  pagination filters, and unchanged ID-filter behavior.
- Verify ID-plus-slug requests return `400`; unknown slugs return an empty page.
- Verify commitment-category translations appear in relevant responses;
  duplicate slugs in one language return `409`, while reuse across languages
  succeeds.
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
- A renamed category translation keeps its current slug unless an admin
  explicitly changes it. Unknown or retired slugs produce empty filter results.

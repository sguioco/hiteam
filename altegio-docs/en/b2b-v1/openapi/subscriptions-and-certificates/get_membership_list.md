# Get a List of Memberships by Filter

Endpoint: GET /chain/{chain_id}/loyalty/abonements
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `chain_id` (number, required)
    Chain ID.
    Example: 123

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `created_after` (string)
    Creation date from (filter by creation date).
    Example: "2026-09-21T23:00:00.000-05:00"

  - `created_before` (string)
    Creation date by (filter by creation date).
    Example: "2026-09-21T23:00:00.000-05:00"

  - `abonements_ids` (array)
    List of membership IDs for the filter.

  - `page` (number)
    Page number.
    Example: 1

  - `count` (number)
    Number of appointments per page.
    Example: 25


## Response 200 fields

## Response 400 fields

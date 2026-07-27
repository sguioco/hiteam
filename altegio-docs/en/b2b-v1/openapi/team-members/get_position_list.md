# Deprecated. Get a list of location positions (deprecated)

This endpoint is deprecated. Use GET /v2/companies/{company_id}/positions instead.

The method allows you to get a list of current positions in the location.

Migration: The V2 Positions API provides enhanced functionality with full CRUD operations, pagination, and JSON:API format responses. See operation list_positions for details.

Endpoint: GET /company/{location_id}/staff/positions
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    location ID

## Response 200 fields (application/json):

  - `data` (array, required)
    Array of objects with data
    Example: [{"id":123,"title":"Job title"}]
    - `id` (number, required)
      position id
      Example: 123
    - `title` (string, required)
      job title
      Example: "Job title"

  - `meta` (array, required)
    Metadata (contains the number of posts found)

  - `success` (boolean, required)
    Execution success status (true)

## Response 401 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 403 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Access denied."

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)



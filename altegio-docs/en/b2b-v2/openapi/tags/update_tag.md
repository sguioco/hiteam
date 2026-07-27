# Update Tag

Updates an existing Tag.

Endpoint: PUT /locations/{company_id}/tags/{tag_id}
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `company_id` (integer, required)
    Location ID

  - `tag_id` (integer, required)
    Tag ID

## Request fields (application/json):

  - `title` (string)
    Tag name
    Example: "VIP Booking User"

  - `color` (string)
    Tag color in
    Example: "#ff2828"

  - `entity` (integer)
    Entity type (0 - general, 1 - Booking User, 2 - Appointment, 3 - Event)
    Enum: 0, 1, 2, 3

  - `icon` (string)
    Icon name
    Example: "star"

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Category cannot be changed"

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Not found"

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)


## Response 204 fields

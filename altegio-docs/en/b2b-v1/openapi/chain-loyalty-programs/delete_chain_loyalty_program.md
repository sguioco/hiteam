# Delete Chain Promotion

Endpoint: DELETE /chain/{chain_id}/loyalty/programs/{loyalty_program_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID

  - `loyalty_program_id` (integer, required)
    Promotion ID

## Query parameters:

  - `include` (string)
    Include additional resources in the answer
    Enum: "applicable_items", "rules", "companies", "loyalty_card_types", "on_changed_notification_template", "on_expiration_notification_template"

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


## Response 204 fields

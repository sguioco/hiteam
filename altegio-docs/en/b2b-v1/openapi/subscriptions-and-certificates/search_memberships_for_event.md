# Search available subscriptions for event

Retrieves subscriptions that can be used to create a client schedule for a series of events.

This method returns subscriptions (memberships) that:
- Belong to the specified client
- Are valid and active
- Can be applied to the specified activity
- Have remaining visits available

Use cases:
- Display available subscriptions when scheduling recurring activity sessions
- Check which subscriptions cover specific activity types
- Validate subscription applicability before creating schedules

Note: Returns subscriptions with their types and availability intervals.

Endpoint: GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/search_for_activity
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID
    Example: 720441

  - `client_id` (integer, required)
    Client ID
    Example: 146915197

## Query parameters:

  - `event_id` (integer, required)
    Event (group event) ID
    Example: 12345

## Response 200 fields (application/json):

  - `data` (array)

  - `data.id` (string)
    Membership instance ID
    Example: "5248829"

  - `data.type` (string)
    Example: "loyalty_abonement"

  - `data.attributes` (object)

  - `data.attributes.number` (string)
    Subscription number
    Example: "690348"

  - `data.attributes.balance` (integer)
    Remaining visits
    Example: 10

  - `data.relationships` (object)

  - `data.relationships.loyalty_abonement_type` (object)

  - `data.relationships.loyalty_abonement_type.data` (object)

  - `data.relationships.loyalty_abonement_type.data.id` (string)
    Example: "489159"

  - `data.relationships.loyalty_abonement_type.data.type` (string)
    Example: "loyalty_abonement_type"

  - `included` (array)
    Related membership types and availability intervals

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Event not found"



# Update service links

Updates service configuration including:
- Team member assignments with custom duration and pricing
- Tech cards (technological cards) for each team member
- Required resources for the service
- Service name translations for different languages

This endpoint allows bulk updating of service-team member relationships
without affecting other service properties.

Endpoint: POST /company/{location_id}/services/links
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID
    Example: 720441

## Request fields (application/json):

  - `service_id` (integer, required)
    Service ID to update
    Example: 10832939

  - `team_member_settings` (array, required)
    List of team members providing this service with duration and tech cards

  - `team_member_settings.team_member_id` (integer)
    Team member ID
    Example: 2033728

  - `team_member_settings.tech_card_id` (integer)
    Tech card ID for this team member's service delivery
    Example: 291341

  - `team_member_settings.hours` (integer)
    Service duration hours

  - `team_member_settings.minutes` (integer)
    Service duration minutes
    Example: 45

  - `team_member_settings.price` (any)
    - `min` (number)
      Minimum price ("from" price)
      Example: 999.99
    - `max` (any)
      Maximum price ("to" price), null for fixed price

  - `resource_ids` (array, required)
    List of resource IDs required to provide this service
    Example: [62173]

  - `translations` (array, required)
    Service name translations for different languages

  - `translations.language_id` (integer)
    Language ID
    Example: 2

  - `translations.translation` (string)
    Translated service name (empty string to clear)
    Example: "Massage"

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

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

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

  - `meta.errors` (object)



# Deprecated. Update Event (deprecated)

This endpoint is deprecated. Use PUT /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides enhanced validation and JSON:API formatted responses. See operation update_event for details.

Endpoint: PUT /activity/{location_id}/{event_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `event_id` (integer, required)
    Event ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `capacity` (number, required)
    Capacity
    Example: 9

  - `date` (string, required)
    date and time
    Example: "2026-10-10 15:30"

  - `force` (boolean, required)
    Ignore errors (busy team member/resources, etc.)

  - `service_id` (number, required)
    Service ID
    Example: 1185299

  - `staff_id` (number, required)
    team member ID
    Example: 26427

  - `resource_instance_ids` (array)
    Array of resource instance IDs
    Example: [3127]

  - `length` (number)
    Event duration in seconds
    Example: 3600

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":108,"salon_id":4564,"service_id":1185299,"staff_id":26427,"date":"2026-09-21T23:00:00.000-05:00","length":3600,"capacity":9,"records_count":0,"color":"","font_color":"","service":{"id":1185299,"title":"Group manicure","category_id":754917},"staff":{"id":26427,"name":"Monica Bellucci","company_id":4564},"resource_instances":[{"id":3127,"title":"Manicure machine #1","resource_id":1364}]}

  - `data.id` (number)
    Event ID
    Example: 108

  - `data.salon_id` (number)
    Location ID (deprecated, use company_id)
    Example: 4564

  - `data.company_id` (number)
    Location ID

  - `data.service_id` (number)
    Service ID
    Example: 1185299

  - `data.staff_id` (number)
    team member ID
    Example: 26427

  - `data.date` (string)
    Event date and time
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.timestamp` (number)
    Unix timestamp of Event date

  - `data.length` (number)
    Event duration in seconds
    Example: 3600

  - `data.capacity` (number)
    Capacity
    Example: 9

  - `data.records_count` (number)
    Number of Appointments in this Event

  - `data.color` (string)
    Event color

  - `data.font_color` (string)
    Font color

  - `data.instructions` (string)
    Event instructions

  - `data.stream_link` (string)
    Stream link for online events

  - `data.notified` (boolean)
    Whether notifications have been sent

  - `data.comment` (string,null)
    Event comment

  - `data.prepaid` (string)
    Prepayment status (forbidden, optional, required)

  - `data.is_deleted` (boolean)
    Whether Event is deleted

  - `data.duration_details` (object)
    Event duration details

  - `data.duration_details.id` (number)
    Duration detail ID

  - `data.duration_details.services_duration` (number)
    Services duration in seconds

  - `data.duration_details.technical_break_duration` (number)
    Technical break duration in seconds

  - `data.service` (object)
    Service
    Example: {"id":1185299,"title":"Group manicure","category_id":754917}

  - `data.service.id` (number)
    Service ID
    Example: 1185299

  - `data.service.title` (string)
    Service name
    Example: "Group manicure"

  - `data.service.category_id` (number)
    Service category identifier
    Example: 754917

  - `data.staff` (object)
    team member
    Example: {"id":26427,"name":"Monica Bellucci","company_id":4564}

  - `data.staff.id` (number)
    team member ID
    Example: 26427

  - `data.staff.name` (string)
    team member name
    Example: "Monica Bellucci"

  - `data.staff.company_id` (number)
    Location ID
    Example: 4564

  - `data.resource_instances` (array)
    Resource instances
    Example: [{"id":3127,"title":"Manicure machine #1","resource_id":1364}]

  - `data.resource_instances.id` (number)
    Resource instance ID

  - `data.resource_instances.title` (string)
    Resource instance name

  - `data.resource_instances.resource_id` (number)
    Resource ID

  - `data.labels` (array)
    Event tags

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.



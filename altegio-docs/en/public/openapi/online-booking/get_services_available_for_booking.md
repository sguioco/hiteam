# Get Services Available for Booking

The object of services available for booking has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| categories | array of objects | Array of service categories (you can't book a category) |
| services | array of objects | Services available for booking by category |

An object from the categories array, has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Category ID |
| title | string | Category name |
| gender | number | Category belonging to gender (1 - male, 2 - female, 0 - not specified) |
| weight | number | Category weight. Categories are sorted by weight, heavier ones first |
| api_id | string | External Category ID |

An object from the services array, has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Service ID |
| title | string | Service name |
| category_id | number | Identifier of the category to which the service belongs |
| weight | number | Category weight. Services are sorted by weight, heavier ones first |
| price_min | number | The minimum cost of the service |
| price_max | number | Maximum cost of the service |
| discount | number | Service discount |
| comment | string | Comment on the service |
| active | number | Is the service active |
| prepaid | string | Online payment status |
| gender | number | Gender for which the service is provided |
| session_length | number | Service duration in seconds (only if filter by team member is set) |
| image | string | Image services |


If you need to get the services provided by a specific team member, then you need to use the filter by team member.
The following filters are available:
+ staff_id: team member ID. If you need services that only the selected team member provides
+ datetime: date (in iso8601 format). Specifies the desired appointment date. Use this parameter to retrieve services that can be booked with the selected team member on that specific date.
+ service_ids: An array of service IDs. If a team member is already selected and the time and service(s) are part of an existing appointment, this parameter should be used to select an additional service.

Endpoint: GET /book_services/{location_id}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 4564

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Query parameters:

  - `staff_id` (number)
    team member ID. Filter by team member ID
Default: 0

  - `datetime` (string)
    date (in iso8601 format). Filter by service booking date (for example '2005-09-09T18:30')
Default: ''
    Example: "2026-09-09T18:30"

  - `service_ids[]` (array)
    Service ID.
Filter by the list of identifiers of already selected (within one appointment) services. It makes sense if a filter by team member and date is set.

## Response 200 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"events":[],"services":[{"id":1896208,"title":"hair wash","category_id":1895571,"price_min":0,"price_max":0,"discount":0,"comment":"","weight":0,"active":0,"gender":0,"image":"","prepaid":"forbidden","seance_length":3600},{"id":1896303,"title":"Coloring","category_id":1895574,"price_min":0,"price_max":0,"discount":0,"comment":"","weight":0,"active":0,"gender":0,"image":"","prepaid":"forbidden","seance_length":3600}],"category":[{"id":1895571,"title":"Hair care","gender":0,"api_id":"0","weight":60},{"id":1895574,"title":"Hair coloring","gender":0,"api_id":"0","weight":7}]}

  - `data.events` (array)
    Example: []

  - `data.services` (array)
    Services
    Example: [{"id":1896208,"title":"hair wash","category_id":1895571,"price_min":0,"price_max":0,"discount":0,"comment":"","weight":0,"active":0,"gender":0,"image":"","prepaid":"forbidden","seance_length":3600},{"id":1896303,"title":"Coloring","category_id":1895574,"price_min":0,"price_max":0,"discount":0,"comment":"","weight":0,"active":0,"gender":0,"image":"","prepaid":"forbidden","seance_length":3600}]

  - `data.services.id` (number)
    Service ID

  - `data.services.title` (string)
    Service name

  - `data.services.category_id` (number)
    ID of the category the service belongs to

  - `data.services.price_min` (number)
    The minimum cost of the service

  - `data.services.price_max` (number)
    Maximum cost of the service

  - `data.services.discount` (number)
    Service discount

  - `data.services.comment` (string)
    Comment on the service

  - `data.services.weight` (number)
    Service weight. On withdrawal, services are sorted by weight, heavier first

  - `data.services.active` (number)
    Is the service active

  - `data.services.gender` (number)
    Gender for which the service is provided

  - `data.services.image` (string)
    Service image

  - `data.services.prepaid` (string)
    Online payment status

  - `data.services.seance_length` (integer,null)
    Service duration in seconds (only if filter by team member is set)

  - `data.services.abonement_restriction` (integer)
    Subscription restriction flag

  - `data.services.prepaid_settings` (object)
    Prepaid settings configuration

  - `data.services.is_composite` (boolean)
    Whether service is composite

  - `data.services.is_chain` (boolean)
    Whether service belongs to chain

  - `data.services.images` (array,null)
    Service images array

  - `data.services.composite_details` (object,null)
    Composite service details

  - `data.category` (array)
    Service categories
    Example: [{"id":1895571,"title":"Hair care","gender":0,"api_id":"0","weight":60},{"id":1895574,"title":"Hair coloring","gender":0,"api_id":"0","weight":7}]

  - `data.category.id` (number)
    Category ID

  - `data.category.title` (string)
    Service category name

  - `data.category.gender` (number)
    Gender for which the service is provided

  - `data.category.api_id` (any)
    External Category ID

  - `data.category.weight` (number)
    Service category weight. Services are sorted by weight, heavier ones first.

  - `meta` (array)
    Metadata (empty array)
    Example: []

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



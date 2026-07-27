# Search Events

Endpoint: GET /activity/{location_id}/search
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

## Query parameters:

  - `from` (string, required)
    Search start date (YYYY-MM-DD format).
    Example: "2026-06-01"

  - `till` (string, required)
    Search end date (YYYY-MM-DD format).
    Example: "2026-07-15"

  - `service_ids` (array)
    Filter by services IDs.
    Example: [123]

  - `staff_ids` (array)
    Filter by team member IDs.
    Example: [456]

  - `resource_ids` (array)
    Filter by resources IDs.
    Example: [789]

  - `page` (number)
    Page number (default 1).
    Example: 1

  - `count` (number)
    Page size (default 25).
    Example: 25

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":3480140,"service_id":5243360,"company_id":68570,"staff_id":921105,"date":"2026-09-21T23:00:00.000-05:00","length":3600,"capacity":40,"records_count":0,"color":"","instructions":"","stream_link":"","font_color":"","notified":false,"prepaid":"forbidden","service":{"id":5243360,"category_id":5092305,"title":"Lecture: is it possible to re-educate a perverted narcissist","price_min":500,"price_max":500,"comment":"Spoiler: no.","image_url":"","salon_service_id":5792535,"prepaid":"forbidden","category":{"id":5092305,"category_id":1,"title":"Psychoanalysis (service category Natalie)"}},"staff":{"id":921105,"name":"Natalie","company_id":68570,"specialization":"Do not touch","rating":4.57,"show_rating":0,"avatar":"https://assets.alteg.io/masters/sm/7/70/70e95a2383e51da_20210426134346.png","avatar_big":"https://assets.alteg.io/masters/origin/7/7d/7da6be6c33a59cd_20210426134346.png","comments_count":7,"votes_count":0,"average_score":4.57,"prepaid":"forbidden","position":{"id":123340,"title":"Psychotherapist"}},"resource_instances":[{"id":83030,"title":"Psychotherapist's office. #one","resource_id":34895}],"labels":{}}]

  - `data.id` (number)
    Event ID

  - `data.service_id` (number)
    Service ID

  - `data.company_id` (number)
    Location ID

  - `data.staff_id` (number)
    team member ID

  - `data.date` (string)
    Session date

  - `data.length` (number)
    Duration

  - `data.capacity` (number)
    Capacity

  - `data.records_count` (number)
    Number of appointments

  - `data.color` (string)
    Color

  - `data.instructions` (string)
    Instructions

  - `data.stream_link` (string)
    Link to instructions

  - `data.font_color` (string)
    Font color

  - `data.notified` (boolean)
    Notifications

  - `data.prepaid` (string)
    Prepayment

  - `data.service` (object)
    Service

  - `data.service.id` (number)
    Service ID

  - `data.service.category_id` (number)
    Service category identifier

  - `data.service.title` (string)
    Service name

  - `data.service.price_min` (number)
    The minimum cost of the service

  - `data.service.price_max` (number)
    Maximum cost of the service

  - `data.service.comment` (string)
    A comment

  - `data.service.image_url` (string)
    The path to the image with the image of the service

  - `data.service.salon_service_id` (number)
    Category ID for the location on the chain

  - `data.service.prepaid` (string)
    Prepayment

  - `data.service.category` (object)
    Category

  - `data.service.category.id` (number)
    Category ID

  - `data.service.category.category_id` (number)
    Product category ID (0 if the item is a product)

  - `data.service.category.title` (string)
    name of category

  - `data.staff` (object)
    team member

  - `data.staff.id` (number)
    team member ID

  - `data.staff.api_id` (string,null)
    team member External ID

  - `data.staff.name` (string)
    team member name

  - `data.staff.company_id` (number)
    Location ID

  - `data.staff.specialization` (string)
    team member specialization

  - `data.staff.rating` (number)
    Rating

  - `data.staff.show_rating` (number)
    Whether to show the team member's rating (1 - show, 0 - do not show)

  - `data.staff.avatar` (string)
    Path to team member avatar file

  - `data.staff.avatar_big` (string)
    The path to the team member's avatar file in a higher resolution

  - `data.staff.comments_count` (number)
    Number of comments to the team member

  - `data.staff.votes_count` (number)
    Number of votes that rated a team member

  - `data.staff.average_score` (number)
    Average rating

  - `data.staff.prepaid` (string)
    Indicates whether online payment is available for the appointment

  - `data.staff.position` (object)
    team member's position

  - `data.staff.position.id` (number)
    Job ID

  - `data.staff.position.title` (string)
    Job Title

  - `data.resource_instances` (array)
    Resource instance

  - `data.resource_instances.id` (number)
    Resource instance ID

  - `data.resource_instances.title` (string)
    Resource instance name

  - `data.resource_instances.resource_id` (number)
    Resource ID

  - `data.labels` (array)
    Post category

  - `meta` (object)
    Metadata (contains the number of Events found)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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



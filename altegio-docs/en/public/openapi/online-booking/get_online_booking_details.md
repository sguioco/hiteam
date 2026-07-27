# Get Online Booking Details

Endpoint: GET /book_record/{location_id}/{record_id}/{record_hash}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `record_id` (number, required)
    Post ID (enough to view the post if the user is logged in)
    Example: 22123

  - `record_hash` (string, required)
    HASH appointments (required to view the appointment if the user is not authorized)
    Example: "'dawd4fs09rhf0s9fafef0'"

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `id` (number)
    Appointment ID
    Example: 13132699

  - `services` (array)
    Service ID List
    Example: [{"id":389043,"title":"Correction of extended nails","cost":2300,"price_min":2300,"price_max":2300,"discount":0,"amount":1,"seance_length":1800}]

  - `services.id` (number)
    Service ID

  - `services.title` (string)
    Service name

  - `services.amount` (integer)
    Number of ordered services

  - `services.seance_length` (integer)
    Service duration in seconds (only if filter by team member is set)

  - `services.cost` (number)
    Service cost

  - `services.price_min` (number)
    Minimum service price

  - `services.price_max` (number)
    Maximum service price

  - `services.discount` (number)
    Discount amount

  - `company` (object)
    location parameters
    Example: {"id":4564,"title":"Nail studio","country_id":7,"country":"United States","city_id":2,"city":"New York","phone":"+13155550175","phones":[],"timezone":"12","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"allow_delete_record":true,"allow_change_record":true,"site":"www.example.com","currency_short_title":"USD","allow_change_record_delay_step":0,"allow_delete_record_delay_step":0}

  - `company.id` (number)
    location ID
    Example: 4564

  - `company.title` (string)
    location name
    Example: "Nail studio"

  - `company.country_id` (number)
    Country ID
    Example: 7

  - `company.country` (string)
    The name of the country in which the organization is located
    Example: "United States"

  - `company.city_id` (number)
    City ID
    Example: 2

  - `company.city` (string)
    Name of the city where the organization is located
    Example: "New York"

  - `company.phone` (string)
    location phone
    Example: "+13155550175"

  - `company.phones` (array)
    Example: []

  - `company.timezone` (string)
    location time zone
    Example: "12"

  - `company.address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `company.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `company.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `company.allow_delete_record` (boolean)
    Example: true

  - `company.allow_change_record` (boolean)
    Example: true

  - `company.site` (string)
    Example: "www.example.com"

  - `company.currency_short_title` (string)
    Example: "USD"

  - `company.allow_change_record_delay_step` (integer)

  - `company.allow_delete_record_delay_step` (integer)

  - `staff` (object)
    team member parameters
    Example: {"id":55436,"name":"Natalie Parker","specialization":"Team Member in manicure and pedicure","position":{"id":446,"title":"Manicurist"},"show_rating":1,"rating":4.84,"votes_count":0,"avatar":"http://example.com/image.png","comments_count":37}

  - `staff.id` (number)
    team member ID
    Example: 55436

  - `staff.name` (string)
    team member name
    Example: "Natalie Parker"

  - `staff.specialization` (string)
    team member specialization
    Example: "Team Member in manicure and pedicure"

  - `staff.position` (object)
    team member's position
    Example: {"id":446,"title":"Manicurist"}

  - `staff.position.id` (number)
    Job ID
    Example: 446

  - `staff.position.title` (string)
    Job title
    Example: "Manicurist"

  - `staff.show_rating` (number)
    Whether to show team member rating (1 - show, 0 - do not show)
    Example: 1

  - `staff.rating` (number)
    team member rating (from 0 to 5)
    Example: 4.84

  - `staff.votes_count` (number)
    Number of votes that rated the team member

  - `staff.avatar` (string)
    Path to team member profile picture
    Example: "http://example.com/image.png"

  - `staff.comments_count` (number)
    Number of comments to a team member
    Example: 37

  - `clients_count` (integer)
    Example: 1

  - `date` (string)
    04-02T12:00:00Z\' (required, string) - Session date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `datetime` (string)
    Session date in ISO
    Example: "2026-10-24T17:30:00-0500"

  - `create_date` (string)
    04-02T12:00:00Z\' (required, string) - Appointment creation date
    Example: "2026-10-20T21:40:24-0500"

  - `comment` (string)
    Appointment Comment

  - `deleted` (boolean)
    Whether the appointment was made (true if removed)
    Example: true

  - `attendance` (number)
    2 - the user confirmed the appointment, 1 - the user came, the services were provided, 0 - the user was waiting, -1 - the user did not show'

  - `length` (number)
    Session duration
    Example: 1800

  - `notify_by_sms` (number)
    Specifies how many hours in advance an SMS reminder should be sent before the appointment. Set to 0 to disable SMS reminders

  - `notify_by_email` (number)
    Specifies how many hours in advance an email reminder should be sent before the appointment. Set to 0 to disable email reminders

  - `master_requested` (boolean)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen.

  - `online` (boolean)
    Indicates whether the appointment was created online by the client (true) or manually by an administrator (false)
    Example: true

  - `api_id` (string)
    External appointment ID

  - `last_change_date` (string)
    The date and time when the appointment was last modified
    Example: "2026-10-24T23:54:02-0500"

  - `prepaid` (boolean)
    Indicates whether online payment is available for the appointment

  - `prepaid_confirmed` (boolean)
    Online payment status

  - `activity_id` (number)
    group  event ID

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



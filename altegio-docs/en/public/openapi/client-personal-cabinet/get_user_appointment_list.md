# Get User Appointments

The JSON Object containing the user appointment parameters has the following fields:

| Field | Type | Mandatory | Description |
| ------------- | ------------- | ------------- | ------------- |
| id | number | YES | Appointment ID |
| services | array of numbers | YES | List of ID service appointments |
| location | object | YES | location parameters |
| staff | object | YES | Parameters of the team member who was booked. Note: "staff" is a legacy field name for team member. |
| clients_count | int | YES | Number of clients |
| date | string | YES | Session date |
| datetime | string | YES | Session date in ISO |
| create_date | string | YES | Appointment creation date |
| length | number | YES | Session duration |
| deleted | boolean | YES | Has the appointment been created ? (true if deleted) |
| notify_by_sms | number | NO | Number of hours in advance to send an SMS reminder for the appointment. Set to 0 to disable SMS reminders |
| notify_by_email | number | NO | Number of hours in advance to send an email reminder for the appointment. Set to 0 to disable email reminders |
| comment | string | YES | Appointment Comment |
| master_requested | boolean | YES | Whether a specific team member was specified when appointment (false if "any team member" was specified) |
| online | boolean | YES | Indicates whether the appointment was created online by the client (true) or manually by an administrator (false) |
| visit_attendance | number | YES | 2 - The user confirmed the appointment, 1 - The user came, the services were provided, 0 - the user was waiting, -1 - the user did not come to visit |
| api_id | string | NO | External Appointment ID |
| last_change_date | string | NO | Date of the last edit of the appointment |
| prepaid | boolean | NO | Is online payment available for appointment |
| prepaid_confirmed | boolean | NO | Online payment status |
| last_change_date | string | NO | Date of the last edit of the appointment |
| activity_id | int | NO | Event ID (for group events) |

Each object in the services array has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Service ID |
| title | string | Service name |
| cost | float | Service cost |
| price_min | float | Minimum price of the service |
| price_max | float | Maximum service price |
| discount | float | Discount |
| amount | int | Number of ordered services |
| session_length | int | Service duration in seconds (only if filter by team member is set) |

The location object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | location ID |
| title | string | location name |
| country_id | number | Identifier of the country in which the location is located |
| country | string | location name |
| city_id | number | Identifier of the city where the location is located) |
| city | string | location city name |
| time zone | string | timezone locations |
| address | string | Address where the location is located |
| phone | string | location's main phone number |
| phones | array of strings | All phone numbers of the location |
| coordinate_lat | float | Latitude where the location is located |
| coordinate lng | float | Longitude |
| allow_delete_record | boolean | Is it possible to delete an appointment |
| allow_change_record | boolean | Is it possible to reschedule the appointment |
| site | string | location website |
| currency_short_title | string | Currency symbol |
| allow_change_record_delay_step | int | Time after which you can reschedule the appointment |
| allow_delete_record_delay_step | int | Time after which you can delete an appointment |

The team member object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | team member ID |
| name | string | team member name |
| specialization | string | team member specialization |
| position | object | team member position |
| show_rating | number | Whether to show team member's rating (1 - show, 0 - don't show) |
| rating | number | team member rating |
| votes_count | number | Number of votes rated team member |
| comments_count | number | Number of comments to a team member |
| avatar | string | Path to team member avatar file |

Endpoint: GET /user/records/{record_id}/{record_hash}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `record_id` (number, required)
    Appointment ID
    Example: 22123

  - `record_hash` (string, required)
    HASH of the appointment
    Example: "'dawd4fs09rhf0s9fafef0'"

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects
    Example: [{"id":13132699,"services":[{"id":389043,"title":"Correction of extended nails","cost":2300,"price_min":2300,"price_max":2300,"discount":0,"amount":1,"seance_length":1800}],"company":{"id":4564,"title":"Nail studio","country_id":7,"country":"United States","city_id":2,"city":"New York","phone":"+13155550175","phones":[],"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"allow_delete_record":true,"allow_change_record":true,"site":"www.example.com","currency_short_title":"USD","allow_change_record_delay_step":0,"allow_delete_record_delay_step":0},"staff":{"id":55436,"name":"Natalie Parker","specialization":"Team Member in manicure and pedicure","position":{"id":446,"title":"Manicurist"},"show_rating":1,"rating":4.84,"votes_count":0,"avatar":"http://example.com/image.png","comments_count":37},"clients_count":1,"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-10-24T17:30:00-0500","create_date":"2026-10-20T21:40:24-0500","comment":"","deleted":true,"attendance":0,"length":1800,"notify_by_sms":0,"notify_by_email":0,"master_requested":false,"online":true,"api_id":"","last_change_date":"2026-10-24T23:54:02-0500","prepaid":false,"prepaid_confirmed":false,"activity_id":0},{"id":13133413,"services":[{"id":389045,"title":"Hand massage (10 min)","cost":300,"price_min":300,"price_max":400,"discount":0,"amount":1,"seance_length":1800}],"company":{"id":4564,"title":"Nail studio","country_id":7,"country":"United States","city_id":2,"city":"New York","phone":"+13155550175","phones":[],"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"allow_delete_record":true,"allow_change_record":true,"site":"www.example.com","currency_short_title":"USD","allow_change_record_delay_step":0,"allow_delete_record_delay_step":0},"staff":{"id":55436,"name":"Natalie Parker","specialization":"Team Member in manicure and pedicure","position":{"id":446,"title":"Manicurist"},"show_rating":1,"rating":4.84,"votes_count":0,"avatar":"http://example.com/image.png","comments_count":37},"clients_count":1,"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-10-24T17:30:00-0500","create_date":"2026-10-20T21:40:24-0500","comment":"","deleted":true,"attendance":0,"length":1800,"notify_by_sms":0,"notify_by_email":0,"master_requested":false,"online":true,"api_id":"","last_change_date":"2026-10-24T23:54:02-0500","prepaid":false,"prepaid_confirmed":false,"activity_id":0}]

  - `data.id` (number)
    Appointment ID

  - `data.services` (array)
    Service ID List

  - `data.services.id` (number)
    Service ID

  - `data.services.title` (string)
    Service name

  - `data.services.amount` (integer)
    Number of ordered services

  - `data.services.seance_length` (integer)
    Service duration in seconds (only if filter by team member is set)

  - `data.services.cost` (number)
    Service cost

  - `data.services.price_min` (number)
    Minimum service price

  - `data.services.price_max` (number)
    Maximum service price

  - `data.services.discount` (number)
    Discount amount

  - `data.company` (object)
    location parameters

  - `data.company.id` (number)
    location ID

  - `data.company.title` (string)
    location name

  - `data.company.country_id` (number)
    Country ID

  - `data.company.country` (string)
    The name of the country in which the organization is located

  - `data.company.city_id` (number)
    City ID

  - `data.company.city` (string)
    Name of the city where the organization is located

  - `data.company.phone` (string)
    location phone

  - `data.company.phones` (array)

  - `data.company.timezone` (string)
    location time zone

  - `data.company.address` (string)
    location address

  - `data.company.coordinate_lat` (number)
    Latitude

  - `data.company.coordinate_lon` (number)
    Longitude

  - `data.company.allow_delete_record` (boolean)

  - `data.company.allow_change_record` (boolean)

  - `data.company.site` (string)

  - `data.company.currency_short_title` (string)

  - `data.company.allow_change_record_delay_step` (integer)

  - `data.company.allow_delete_record_delay_step` (integer)

  - `data.staff` (object)
    team member parameters

  - `data.staff.id` (number)
    team member ID

  - `data.staff.name` (string)
    team member name

  - `data.staff.specialization` (string)
    team member specialization

  - `data.staff.position` (object)
    team member's position

  - `data.staff.position.id` (number)
    Job ID

  - `data.staff.position.title` (string)
    Job title

  - `data.staff.show_rating` (number)
    Whether to show team member rating (1 - show, 0 - do not show)

  - `data.staff.rating` (number)
    team member rating (from 0 to 5)

  - `data.staff.votes_count` (number)
    Number of votes that rated the team member

  - `data.staff.avatar` (string)
    Path to team member profile picture

  - `data.staff.comments_count` (number)
    Number of comments to a team member

  - `data.clients_count` (integer)

  - `data.date` (string)
    04-02T12:00:00Z\' (required, string) - Session date

  - `data.datetime` (string)
    Session date in ISO

  - `data.create_date` (string)
    04-02T12:00:00Z\' (required, string) - Appointment creation date

  - `data.comment` (string)
    Appointment Comment

  - `data.deleted` (boolean)
    Whether the appointment was made (true if removed)

  - `data.attendance` (number)
    2 - the user confirmed the appointment, 1 - the user came, the services were provided, 0 - the user was waiting, -1 - the user did not show

  - `data.length` (number)
    Appointment duration in seconds. Includes technical_break_duration. Equal to the sum of services plus the technical break.

  - `data.notify_by_sms` (number)
    Specifies how many hours in advance an SMS reminder should be sent before the appointment. Set to 0 to disable SMS reminders

  - `data.notify_by_email` (number)
    Specifies how many hours in advance an email reminder should be sent before the appointment. Set to 0 to disable email reminders

  - `data.master_requested` (boolean)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen

  - `data.online` (boolean)
    Indicates whether the appointment was created online by the client (true) or manually by an administrator (false)

  - `data.api_id` (string)
    External appointment ID

  - `data.last_change_date` (string)
    The date and time when the appointment was last modified

  - `data.prepaid` (boolean)
    Indicates whether online payment is available for the appointment

  - `data.prepaid_confirmed` (boolean)
    Online payment status

  - `data.activity_id` (number)
    Group event ID

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



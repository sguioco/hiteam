# Change Online Booking Date/Time

Endpoint: PUT /book_record/{location_id}/{record_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `record_id` (number, required)
    ID of the appointment to be migrated

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `datetime` (string)
    Date and time to which we want to move the appointment
    Example: "2026-09-21T23:00:00.000-05:00"

  - `comment` (string)
    Appointment Comment
    Example: "DODO!"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Data (object)
    Example: {"id":30358,"services":[{"id":2838,"title":"Foot massage","cost":0,"discount":0}],"company":{"id":4564,"title":"Business Example","country_id":0,"country":"United States","city_id":0,"city":"New York","phone":"+13155550175","timezone":"0","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242},"staff":{"id":924,"name":"Evgenia","spec":"about eu","show_rating":1,"rating":5,"votes_count":1,"avatar":"https://app.alteg.io/images/no-master.png","comments_count":0},"date":"2026-09-21T23:00:00.000-05:00","create_date":"2026-09-21T23:00:00.000-05:00","comment":"","deleted":true,"length":3600,"notify_by_sms":0,"notify_by_email":0,"master_requested":false,"online":true,"api_id":0}

  - `data.id` (integer)
    Appointment ID
    Example: 30358

  - `data.services` (array)
    Service ID List
    Example: [{"id":2838,"title":"Foot massage","cost":0,"discount":0}]

  - `data.services.id` (integer)

  - `data.services.title` (string)

  - `data.services.cost` (integer)

  - `data.services.discount` (integer)

  - `data.company` (object)
    location parameters
    Example: {"id":4564,"title":"Business Example","country_id":0,"country":"United States","city_id":0,"city":"New York","phone":"+13155550175","timezone":"0","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242}

  - `data.company.id` (integer)
    location ID
    Example: 4564

  - `data.company.title` (string)
    Name of the organization
    Example: "Business Example"

  - `data.company.country_id` (number)
    Country ID

  - `data.company.country` (string)
    The name of the country in which the organization is located
    Example: "United States"

  - `data.company.city_id` (number)
    City ID

  - `data.company.city` (string)
    Name of the city where the organization is located
    Example: "New York"

  - `data.company.phone` (string)
    location phone
    Example: "+13155550175"

  - `data.company.timezone` (string)
    location time zone
    Example: "0"

  - `data.company.address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `data.company.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `data.company.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `data.staff` (object)
    team member parameters
    Example: {"id":924,"name":"Evgenia","spec":"about eu","show_rating":1,"rating":5,"votes_count":1,"avatar":"https://app.alteg.io/images/no-master.png","comments_count":0}

  - `data.staff.id` (integer)
    team member ID
    Example: 924

  - `data.staff.name` (string)
    team member name
    Example: "Evgenia"

  - `data.staff.spec` (string)
    team member specialization
    Example: "about eu"

  - `data.staff.show_rating` (number)
    Whether to show team member rating (1 - show, 0 - do not show)
    Example: 1

  - `data.staff.rating` (number)
    team member rating (from 0 to 5)
    Example: 5

  - `data.staff.votes_count` (number)
    Number of votes that rated the team member
    Example: 1

  - `data.staff.avatar` (string)
    Path to team member profile picture
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.staff.comments_count` (number)
    Number of comments to a team member

  - `data.date` (string)
    04-02T12:00:00Z\' (required, string) - Session date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.create_date` (string)
    04-02T12:00:00Z\' (required, string) - Appointment creation date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.comment` (string)
    Appointment Comment

  - `data.deleted` (boolean)
    Whether the appointment was made (true if removed)
    Example: true

  - `data.length` (number)
    Session duration
    Example: 3600

  - `data.notify_by_sms` (number)
    Specifies how many hours before the visit an SMS reminder should be sent to the client. Set to 0 if no reminder is needed.

  - `data.notify_by_email` (number)
    Specifies how many hours before the visit an email reminder should be sent to the client. Set to 0 if no reminder is needed.

  - `data.master_requested` (boolean)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen.

  - `data.online` (boolean)
    Indicates whether the appointment was created online by the client (true) or manually by an administrator (false)
    Example: true

  - `data.api_id` (number)
    Appointment ID from external system

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



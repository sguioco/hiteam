# Get a list of locations

Get a list of locations with data

Endpoint: GET /companies
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    Must be application/vnd.api.v2+json

  - `Content-Type` (string, required)
    Must be application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Query parameters:

  - `id` (number)
    Filter by location ID
    Example: 4564

  - `group_id` (number)
    Filter by location chain ID _Default: 83_
    Example: 83

  - `my` (number)
    For authorized user only. If you need locations that the user has rights to manage
    Example: 1

  - `active` (number)
    If you need to get only locations with an active license and an available appointment
    Example: 1

  - `forBooking` (number)
    Include date and time of the next free session in the location (ISO8601)
    Example: 1

  - `show_groups` (number)
    Include in the location object a list of chains that this location belongs to
    Example: 1

  - `city_id` (number)
    Filter by city ID (cities getting method)
    Example: 2

  - `showBookforms` (number)
    Include in the location object a list of location online booking forms
    Example: 1

  - `min_id` (number)
    Filter by minimum location ID
    Example: 1000

  - `show_deleted` (number)
    Include deleted locations
    Example: 1

  - `hide_record_type_single` (number)
    Hide locations with individual appointment
    Example: 1

  - `hide_record_type_activity` (number)
    Hide locations with group appointment
    Example: 1

  - `hide_record_type_mixed` (number)
    Hide locations with mixed appointment
    Example: 1

  - `business_group_id` (number)
    Filter by business group ID
    Example: 1

  - `business_type_id` (number)
    Filter by business type ID
    Example: 1

  - `include` (array)
    Include additional data in the location object
    Enum: "staff", "positions", "accounts", "storages", "expenses"

  - `count` (number)
    Number of locations per page

  - `page` (number)
    Page number

## Response 200 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (array)
    Array of objects
    Example: [{"id":1050,"title":"La Visage","public_title":"La Visage Beauty","short_descr":"Beauty saloon","logo":"https://app.alteg.io/images/no-master.png","active":1,"phone":"+13155550175","phones":["+13155550175"],"email":"info@lavisage.com","country_id":7,"schedule":"","country":"United States","city_id":181,"city":"New York","timezone":-5,"timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"phone_confirmation":true,"active_staff_count":2,"next_slot":"2026-03-23T10:10:00-05:00","app_ios":"","app_android":"","currency_short_title":"$","reminds_sms_disabled":false,"reminds_sms_default":1,"group_priority":900,"bookform_group_priority":0,"description":"<p>Welcome to La Visage</p>","photos":[],"booking_widget_promo":null}]

  - `data.id` (number)
    location ID

  - `data.title` (string)
    location name

  - `data.public_title` (string)
    Public display name of the location

  - `data.short_descr` (string)
    location category

  - `data.logo` (string)
    location logo image address

  - `data.active` (integer)
    Is the location active (1 = active, 0 = inactive)

  - `data.phone` (string)
    location phone number

  - `data.phones` (array)
    Array of location phone numbers

  - `data.email` (string)
    Location email address

  - `data.country_id` (number)
    Identifier of the country in which the location is located

  - `data.schedule` (string)
    location schedule

  - `data.country` (string)
    location country name

  - `data.city_id` (number)
    City ID where the location is located

  - `data.city` (string)
    location city name

  - `data.timezone` (number)
    Timezone offset in hours

  - `data.timezone_name` (string)
    timezone locations

  - `data.address` (string)
    Address where the location is located

  - `data.coordinate_lat` (number)
    Latitude

  - `data.coordinate_lon` (number)
    Longitude

  - `data.phone_confirmation` (boolean)
    Do I need to confirm my phone number via SMS when appointment?

  - `data.active_staff_count` (number)
    Number of team members available for appointment

  - `data.next_slot` (string)
    Date and time of the next free session in the location (ISO8601). The field will be present only if the GET parameter forBooking=1 is passed

  - `data.app_ios` (string)
    Link to iOS App

  - `data.app_android` (string)
    Link to app for Android

  - `data.currency_short_title` (string)
    Abbreviated currency name

  - `data.reminds_sms_disabled` (boolean)
    SMS reminders disabled

  - `data.reminds_sms_default` (integer)
    Default SMS reminder setting

  - `data.group_priority` (number)
    The higher the priority, the higher the location when displayed in the list of chain locations

  - `data.bookform_group_priority` (number)
    Priority for booking form display

  - `data.description` (string)
    Full HTML description of the location

  - `data.photos` (array)
    Array of location photo paths

  - `data.company_photos` (array)
    Array of full location photo URLs

  - `data.booking_widget_promo` (object,null)
    Booking widget promo configuration

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



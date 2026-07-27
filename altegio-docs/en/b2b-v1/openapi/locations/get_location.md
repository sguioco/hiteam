# Get location

Getting information about the location.

Endpoint: GET /company/{location_id}
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    Must be application/vnd.api.v2+json

  - `Content-Type` (string, required)
    Must be application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Path parameters:

  - `location_id` (number, required)
    The ID of the location to get information about.
    Example: 37532

## Query parameters:

  - `my` (number)
    For authorized user only. If you need additional data for the location that the user has rights to manage
    Example: 1

  - `forBooking` (number)
    Date and time of the next free session in the location (ISO8601).
    Example: 1

  - `show_groups` (number)
    Include in the location object a list of chains that this location belongs to
    Example: 1

  - `showBookforms` (number)
    Show location online booking forms (widgets)
    Example: 1

  - `bookform_id` (number)
    Show url of online booking form with specified ID
    Example: 19203

## Response 200 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":37532,"title":"James Smith LLC","country_id":7,"country":"United States","city_id":181,"city":"New York","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","zip":"11435","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"short_descr":"Beauty studio","social":{"facebook":"","instagram":"instagram.com/james_smith_company/","telegram":"","whatsapp":"","viber":""},"site":"james-smith-company.com","business_type_id":1,"description":"The <strong>James Smith</strong> location","phone_confirmation":true,"active_staff_count":2,"next_slot":"2026-03-23T10:10:00-05:00","group_priority":900,"push_notification_phone_confirm":1,"main_group_id":9206,"main_group":{"id":9206,"title":"James Smith LLC main location chain"},"groups":{"9206":{"id":9206,"title":"James Smith LLC main location chain"},"9207":{"id":9207,"title":"James Smith LLC extra location chain"}},"bookforms":[{"id":19203,"title":"James Smith LLC location appointment form","is_default":0,"url":"https://n19203.alteg.io/"}],"online_sales_form_url":"https://o1.alteg.io","payment_policy":{"type":"deposit"},"access":{}}

  - `data.id` (number)
    location ID
    Example: 37532

  - `data.title` (string)
    location name
    Example: "James Smith LLC"

  - `data.country_id` (number)
    Identifier of the country in which the location is located
    Example: 7

  - `data.country` (string)
    Name of the country in which the location is located
    Example: "United States"

  - `data.city_id` (number)
    City ID where the location is located
    Example: 181

  - `data.city` (string)
    Name of the city where the location is located
    Example: "New York"

  - `data.timezone_name` (string)
    timezone locations
    Example: "America/New_York"

  - `data.address` (string)
    Address where the location is located
    Example: "New York, 787 Jackson Drive"

  - `data.zip` (string)
    Zip code
    Example: "11435"

  - `data.social` (object)
    location social media
    Example: {"facebook":"","instagram":"instagram.com/james_smith_company/","telegram":"","whatsapp":"","viber":""}

  - `data.social.telegram` (string)
    Telegram

  - `data.social.instagram` (string)
    Instagram
    Example: "instagram.com/james_smith_company/"

  - `data.social.vk` (string)
    VK (social network)

  - `data.social.facebook` (string)
    Facebook

  - `data.social.viber` (string)
    Viber

  - `data.social.whatsapp` (string)
    WhatsApp

  - `data.site` (string)
    location website
    Example: "james-smith-company.com"

  - `data.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `data.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `data.phone_confirmation` (boolean)
    Do I need to confirm the phone by SMS when appointment
    Example: true

  - `data.active_staff_count` (number)
    Number of team members available for appointment
    Example: 2

  - `data.next_slot` (string)
    Date and time of the next free session in the location (ISO8601). The field will be present only if the GET parameter forBooking=1 is passed
    Example: "2026-03-23T10:10:00-05:00"

  - `data.group_priority` (integer)
    The higher the priority, the higher the location when displayed in the list of chain locations
    Example: 900

  - `data.push_notification_phone_confirm` (any)
    Confirm client number to send push notifications (0/1 or boolean)
    Example: 1

  - `data.main_group_id` (number)
    Main location chain ID
    Example: 9206

  - `data.main_group` (any)
    Main location chain (object or empty array)
    Example: {"id":9206,"title":"James Smith LLC main location chain"}
    - `id` (number)
      Chain ID
      Example: 9206
    - `title` (string)
      Chain name
      Example: "James Smith LLC main location chain"

  - `data.groups` (object)
    All location chains. Only when show_groups=1 is set
    Example: {"9206":{"id":9206,"title":"James Smith LLC main location chain"},"9207":{"id":9207,"title":"James Smith LLC extra location chain"}}

  - `data.bookforms` (array)
    location online booking forms (widgets)
    Example: [{"id":19203,"title":"James Smith LLC location appointment form","is_default":0,"url":"https://n19203.alteg.io/"}]

  - `data.bookforms.id` (number)
    appointment form ID

  - `data.bookforms.title` (string)
    appointment form name

  - `data.bookforms.is_default` (number)
    Is this appointment form location default

  - `data.bookforms.url` (string)
    appointment form url

  - `data.online_sales_form_url` (string)
    appointment form url. Only if bookform_id is set
    Example: "https://o1.alteg.io"

  - `data.payment_policy` (object)
    Currently enabled payment policy for the location
    Example: {"type":"deposit"}

  - `data.payment_policy.type` (string)
    Payment policy type: none — disabled, deposit — prepaid deposit, card_guarantee — card guarantee
    Enum: "none", "deposit", "card_guarantee"

  - `data.access` (object)
    Access rights list. Only if my=1 is set
    Example: {}

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 401 fields (application/json):

  - `errors` (object)
    Additional response data.

  - `errors.code` (number)
    Error number.
    Example: 401

  - `errors.message` (string)
    Error message.
    Example: "Authentication needed"

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 404 fields (application/json):

  - `errors` (object)
    Additional response data.

  - `errors.code` (number)
    Error number.
    Example: 404

  - `errors.message` (string)
    Error message.
    Example: "Not found"

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Not found"



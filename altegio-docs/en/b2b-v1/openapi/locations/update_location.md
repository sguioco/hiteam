# Change location

Change location data

Endpoint: PUT /company/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 37532

## Header parameters:

  - `Accept` (string, required)
    Must be application/vnd.api.v2+json

  - `Content-Type` (string, required)
    Must be application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `title` (string)
    location name
    Example: "James Smith LLC"

  - `country_id` (number)
    Country ID (has higher priority then country)

  - `country` (string)
    Country
    Example: "United States"

  - `city_id` (number)
    City ID (has higher priority then city)

  - `city` (string)
    City
    Example: "New York"

  - `address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `zip` (string)
    Zip code
    Example: "11435"

  - `phones` (array)
    location phone numbers
    Example: ["12125357710","12125357711"]

  - `social` (object)
    location social media
    Example: {"instagram":"instagram.com/james_smith_company/"}

  - `social.telegram` (string)
    Telegram

  - `social.instagram` (string)
    Instagram
    Example: "instagram.com/james_smith_company/"

  - `social.vk` (string)
    VK (social network)

  - `social.facebook` (string)
    Facebook

  - `social.viber` (string)
    Viber

  - `social.whatsapp` (string)
    WhatsApp

  - `site` (string)
    location website
    Example: "james-smith-company.com"

  - `coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `description` (string)
    Description
    Example: "The <strong>James Smith</strong> location"

  - `business_type_id` (number)
    Business type
    Example: 1

  - `short_descr` (string)
    Business category
    Example: "Beauty studio"

## Response 200 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (object)
    Example: {"id":37532,"title":"James Smith LLC","country_id":7,"country":"United States","city_id":181,"city":"New York","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","zip":"11435","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"short_descr":"Beauty studio","social":{"facebook":"","instagram":"instagram.com/james_smith_company/","telegram":"","whatsapp":"","viber":""},"site":"james-smith-company.com","business_type_id":1,"description":"The <strong>James Smith</strong> location","phone_confirmation":true,"group_priority":900,"push_notification_phone_confirm":1,"access":{}}

  - `data.id` (number)
    location ID
    Example: 37532

  - `data.title` (string)
    location name
    Example: "James Smith LLC"

  - `data.country_id` (number)
    Country ID
    Example: 7

  - `data.country` (string)
    Country name
    Example: "United States"

  - `data.city_id` (number)
    City ID
    Example: 181

  - `data.city` (string)
    City name
    Example: "New York"

  - `data.timezone_name` (string)
    Timezone name
    Example: "America/New_York"

  - `data.address` (string)
    location address
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

  - `data.description` (string)
    Description
    Example: "The <strong>James Smith</strong> location"

  - `data.business_type_id` (number)
    Business type
    Example: 1

  - `data.short_descr` (string)
    Business category
    Example: "Beauty studio"

  - `data.phone_confirmation` (boolean)
    Do I need to confirm my phone number via SMS when appointment?
    Example: true

  - `data.group_priority` (integer)
    The higher the priority, the higher the location when displayed in the list of chain locations
    Example: 900

  - `data.push_notification_phone_confirm` (any)
    Confirm client number to send push notifications (0/1 or boolean)
    Example: 1

  - `data.main_group_id` (number)
    Main location chain ID

  - `data.main_group` (any)
    Main location chain (object or empty array)
    - `id` (number)
      Chain ID
    - `title` (string)
      Chain name

  - `data.access` (object)
    Access rights list
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



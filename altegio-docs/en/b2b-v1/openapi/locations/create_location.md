# Create a location

Create new location

Endpoint: POST /companies
Version: 1.0.0
Security: BearerPartnerUser

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
    ID of the country in which the location is located ([method to get a list of countries](#countries))
    Example: 7

  - `city_id` (number)
    Identifier of the city in which the location is located ([method to get a list of cities](#cities))
    Example: 2

  - `address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `site` (string)
    location website
    Example: "james-smith-company.com"

  - `coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `coordinate_lot` (number)
    Longitude
    Example: -73.935242

  - `business_type_id` (number)
    Business type
    Example: 1

  - `short_descr` (string)
    location category
    Example: "Beauty studio"

## Response 201 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (object)
    data object
    Example: {"id":1050,"title":"James Smith LLC","short_descr":"Beauty studio","logo":"https://app.alteg.io/images/no-master.png","active":1,"phone":"+13155550175","country_id":7,"schedule":"","country":"United States","city_id":181,"city":"New York","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"phone_confirmation":true,"active_staff_count":2,"app_ios":"","app_android":"","currency_short_title":"R"}

  - `data.id` (number)
    location ID
    Example: 1050

  - `data.title` (string)
    location name
    Example: "James Smith LLC"

  - `data.short_descr` (string)
    location category
    Example: "Beauty studio"

  - `data.logo` (string)
    Path to location logo image
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.active` (number)
    Is the location active (presence of a paid license) (1 - active, 0 - inactive)
    Example: 1

  - `data.phone` (string)
    location phone number
    Example: "+13155550175"

  - `data.country_id` (number)
    Identifier of the country in which the location is located
    Example: 7

  - `data.schedule` (string)
    location schedule

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

  - `data.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `data.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `data.phone_confirmation` (boolean)
    Do I need to confirm my phone number via SMS when appointment?
    Example: true

  - `data.active_staff_count` (number)
    Number of team members available for appointment
    Example: 2

  - `data.app_ios` (string)
    Link to iOS App

  - `data.app_android` (string)
    Link to Android App

  - `data.currency_short_title` (string)
    Abbreviated currency name
    Example: "R"

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

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)



# Get Booking Form Configuration

Each Altegio client can create an unlimited number of Online Booking forms with different designs and booking scenarios.

Typically, the ID of a booking form is embedded in the subdomain. For example: https://b123.alteg.io, where 123 is the booking form ID. This ID can be used to retrieve all necessary parameters for implementing Online Booking and to determine whether the booking applies to a specific location or a location chain.

For chain widgets, you will also need to call the [GET] /locations method with the company_id filter to retrieve the list of locations available for booking.


The object containing the Online Booking form settings includes the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| steps | Array of objects | Booking form steps with custom settings |
| style | object | Booking form design settings |
| group_id | number | Location chain ID (0 - if the booking form is for a non-chain location) |
| company_id | number | Location ID (always returned, used to get additional settings) |
| phone_confirmation | boolean | Do I need to confirm the phone by SMS (if groupid = 0 (not a group form), otherwise look in the settings of each location separately)
| language | string | Booking form language (code from langs array) |
| langs | array of object | List of widget languages
| comment_required | boolean | Whether the field with a comment within booking is required
| google_analytics_id | string | Google Analytics ID
| facebook_pixel_id | string | Facebook Pixel ID
| sms_enabled | boolean | Is sending SMS available?
| comment_input_name | string (optional) | Title for the field with a comment to the booking (if not set, the default value is used)
| booking_notify_text | string (optional) | The text of the notification that is displayed (if set) at the step of entering contact data
| is_show_privacy_policy | boolean | Whether it is necessary to display the text of the agreement on the personal data processing policy to the user
| specialization_display_mode | number | Display the specialization or position of the team member. 0 - Specialization, 1 - Position

The steps array consists of objects that have the following fields:

| Field | Type | Description | For what steps is specified |
| ------------- | ------------- | ------------- | ------------- |
| step | string | Step city/company/service/team member/datetime/contact/confirm |
| title | string | Name of the step to display in the interface | For everyone |
| number | number | What number should this step be displayed on (starting from 1) | For everyone |
| default | string or number | The default value for this step, if set | For all but datetime |
| hidden | boolean | Hide this step when booking or not | For everyone |
| date_hidden | boolean | Hide this step when booking or not | For datetime |
| time_hidden | boolean | Hide this step when booking or not | For datetime |
| date_default | string | The default value for this step, if set | For datetime |
| time_default | number | The default value for this step, if set | For datetime |

The style object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| show header | boolean | Show header and menu or not |
| logo | string | Path to logo image |
| header_background | string | Path to subtitle background image |
| menu_background | string | Path to menu background image |
| primaryPalette | string | The main color of the form (all colors from the list: red, pink, purple, deep-purple, indigo, blue, light-blue, cyan, teal, green, light-green, lime, yellow, amber, orange, deep-orange, brown , grey, blue-grey, white, black) |
| accentPalette | string | Form secondary color (subtitle semi-transparent cover) |
| warnPalette | string | Booking form buttons color |
| backgroundPalette | string | Booking form background color |

Endpoint: GET /bookform/{id}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `id` (number, required)
    ID of thebooking form
    Example: 1

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"steps":[{"step":"master","title":"Choose a team member","num":2,"hidden":false,"default":-1},{"step":"service","title":"Choose a service","num":1,"hidden":true,"default":196},{"step":"datetime","title":"Select date and time","num":3,"hidden":false,"date_hidden":false,"time_hidden":false,"date_default":"0000-00-00","time_default":0},{"step":"contact","title":"Business Example","num":3,"hidden":false,"default":0},{"step":"comfirm","title":"Business Example","num":4,"hidden":false,"default":0}],"style":{"show_header":true,"logo":"https://app.alteg.io/uploads/logo.png","header_background":"https://app.alteg.io/uploads/header.png","menu_background":"https://app.alteg.io/uploads/menu.png","main_color":"#FFCB00","secondary_color":"#999999","buttons_color":"#FFFFFF"},"group_id":1,"company_id":1,"phone_confirmation":false,"lang":"en-US","langs":[{"id":2,"code":"en-US","title":"English"},{"id":4,"code":"lv-LV","title":"Latviešu valoda"},{"id":5,"code":"et-EE","title":"Eesti keel"},{"id":6,"code":"lt-LT","title":"Lietuva"},{"id":7,"code":"uk-UK","title":"Ukrainian"},{"id":8,"code":"fr-FR","title":"Français"},{"id":9,"code":"it-IT","title":"Italiano"},{"id":10,"code":"es-ES","title":"Español"},{"id":13,"code":"ka-KA","title":"ქართული"},{"id":14,"code":"hy-AM","title":"Հայերեն"},{"id":15,"code":"kk-KK","title":"Kazakh tili"},{"id":16,"code":"hr-HR","title":"Hrvatski jezik"},{"id":17,"code":"cs-CS","title":"český jazyk"},{"id":18,"code":"ro-RO","title":"Limba Română"},{"id":19,"code":"cn-CN","title":"中文"},{"id":20,"code":"ar-AR","title":"العَرَبِيَّة"},{"id":21,"code":"bg-BG","title":"Bulgarian"},{"id":22,"code":"he-IL","title":"עברית"},{"id":23,"code":"hu-HU","title":"Magyar nyelv"},{"id":24,"code":"Lt-sr-SP","title":"Srpski jezik"},{"id":25,"code":"sk-SK","title":"Slovenský jazyk"},{"id":26,"code":"mn-MN","title":"Mongol hal"},{"id":27,"code":"az-AZ","title":"Azərbaycan dili"},{"id":28,"code":"pl-PL","title":"Polszczyzna"},{"id":30,"code":"sl-SL","title":"Slòvēnskī"}],"comment_required":false,"metrika_counter_id":50217133,"google_analytics_id":"UA-125358345-1","facebook_pixel_id":"2218788388343154","app_metrika_id":"46ab3b93-1bc6-457d-82f0-c1b51f39b01e","sms_enabled":true}

  - `data.steps` (array)
    appointment form steps with custom settings
    Example: [{"step":"master","title":"Choose a team member","num":2,"hidden":false,"default":-1},{"step":"service","title":"Choose a service","num":1,"hidden":true,"default":196},{"step":"datetime","title":"Select date and time","num":3,"hidden":false,"date_hidden":false,"time_hidden":false,"date_default":"0000-00-00","time_default":0},{"step":"contact","title":"Business Example","num":3,"hidden":false,"default":0},{"step":"comfirm","title":"Business Example","num":4,"hidden":false,"default":0}]

  - `data.steps.step` (string)
    Selection step (Service / team member / date)

  - `data.steps.title` (string)
    The name of the step to display in the interface

  - `data.steps.num` (number)
    What number should this step be displayed on (starting from 1)

  - `data.steps.hidden` (boolean)
    Hide this step when appointment or not

  - `data.steps.default` (number,string)
    Default value for this step

  - `data.steps.date_default` (string)
    Default date value (for datetime step)

  - `data.steps.time_default` (number)
    Default time value (for datetime step)

  - `data.steps.date_hidden` (boolean)
    Hide date selection (for datetime step)

  - `data.steps.time_hidden` (boolean)
    Hide time selection (for datetime step)

  - `data.steps.is_title_default` (boolean)
    Is title default or custom

  - `data.steps.category_view_type` (string)
    Category view type (e.g., "horizontal_tags")

  - `data.style` (object)
    appointment form design settings
    Example: {"show_header":true,"logo":"https://app.alteg.io/uploads/logo.png","header_background":"https://app.alteg.io/uploads/header.png","menu_background":"https://app.alteg.io/uploads/menu.png","main_color":"#FFCB00","secondary_color":"#999999","buttons_color":"#FFFFFF"}

  - `data.style.show_header` (boolean)
    Display header and menu or not
    Example: true

  - `data.style.logo` (string)
    Path to logo image
    Example: "https://app.alteg.io/uploads/logo.png"

  - `data.style.header_background` (string)
    Path to subtitle background image
    Example: "https://app.alteg.io/uploads/header.png"

  - `data.style.menu_background` (string)
    Path to menu background image
    Example: "https://app.alteg.io/uploads/menu.png"

  - `data.style.main_color` (string)
    The main color of the form (all colors from the list: red, pink, purple, deep-purple, indigo, blue, light-blue, cyan, teal, green, light-green, lime, yellow, amber, orange, deep-orange, brown , grey, blue-grey, white, black)
    Example: "#FFCB00"

  - `data.style.secondary_color` (string)
    Form secondary color (subtitle semi-transparent cover)
    Example: "#999999"

  - `data.style.buttons_color` (string)
    Button color
    Example: "#FFFFFF"

  - `data.style.logo_full` (string)
    Full path to logo image

  - `data.style.header_background_full` (string)
    Full path to header background image

  - `data.style.menu_background_full` (string)
    Full path to menu background image

  - `data.style.primaryPalette` (string)
    Primary palette color

  - `data.style.accentPalette` (string)
    Accent palette color

  - `data.style.warnPalette` (string)
    Warning palette color

  - `data.style.backgroundPalette` (string)
    Background palette color

  - `data.style.main_color_theme` (string)
    Main color theme identifier

  - `data.style.header_background_new` (any)
    New header background image configuration (empty array if not configured)
    - `sm` (string)
      Small image URL
    - `norm` (string)
      Normal image URL
    - `origin` (string)
      Original image URL

  - `data.group_id` (number)
    location chain ID (0 - if the appointment form for a non-chain location
    Example: 1

  - `data.company_id` (number)
    location ID (always returned, used to get additional settings)
    Example: 1

  - `data.phone_confirmation` (boolean)
    Do I need to confirm the phone by SMS (if groupid = 0 (not a chain form), otherwise look in the settings of each location separately)

  - `data.lang` (string)
    appointment form language (code from langs array)
    Example: "en-US"

  - `data.langs` (array)
    List of widget languages
    Example: [{"id":2,"code":"en-US","title":"English"},{"id":4,"code":"lv-LV","title":"Latviešu valoda"},{"id":5,"code":"et-EE","title":"Eesti keel"},{"id":6,"code":"lt-LT","title":"Lietuva"},{"id":7,"code":"uk-UK","title":"Ukrainian"},{"id":8,"code":"fr-FR","title":"Français"},{"id":9,"code":"it-IT","title":"Italiano"},{"id":10,"code":"es-ES","title":"Español"},{"id":13,"code":"ka-KA","title":"ქართული"},{"id":14,"code":"hy-AM","title":"Հայերեն"},{"id":15,"code":"kk-KK","title":"Kazakh tili"},{"id":16,"code":"hr-HR","title":"Hrvatski jezik"},{"id":17,"code":"cs-CS","title":"český jazyk"},{"id":18,"code":"ro-RO","title":"Limba Română"},{"id":19,"code":"cn-CN","title":"中文"},{"id":20,"code":"ar-AR","title":"العَرَبِيَّة"},{"id":21,"code":"bg-BG","title":"Bulgarian"},{"id":22,"code":"he-IL","title":"עברית"},{"id":23,"code":"hu-HU","title":"Magyar nyelv"},{"id":24,"code":"Lt-sr-SP","title":"Srpski jezik"},{"id":25,"code":"sk-SK","title":"Slovenský jazyk"},{"id":26,"code":"mn-MN","title":"Mongol hal"},{"id":27,"code":"az-AZ","title":"Azərbaycan dili"},{"id":28,"code":"pl-PL","title":"Polszczyzna"},{"id":30,"code":"sl-SL","title":"Slòvēnskī"}]

  - `data.langs.id` (integer)

  - `data.langs.code` (string)

  - `data.langs.title` (string)

  - `data.comment_required` (boolean)
    Whether the field with a comment on the appointment is required

  - `data.google_analytics_id` (string)
    Google Analytics ID
    Example: "UA-125358345-1"

  - `data.facebook_pixel_id` (string)
    Facebook Pixel ID
    Example: "2218788388343154"

  - `data.metrika_counter_id` (number,null)
    Metrika counter ID (web analytics)
    Example: 50217133

  - `data.app_metrika_id` (string,null)
    AppMetrika ID (mobile analytics)
    Example: "46ab3b93-1bc6-457d-82f0-c1b51f39b01e"

  - `data.sms_enabled` (boolean)
    Is sending SMS available?
    Example: true

  - `data.id` (number)
    Booking form ID

  - `data.url` (string)
    Booking form URL

  - `data.staff_name` (object)
    Team member name configuration

  - `data.without_menu` (boolean)
    Step mode flag

  - `data.sequence_type` (string)
    Sequence type (e.g., "steps")

  - `data.client_scripts` (string)
    Client-side scripts

  - `data.y_injection` (string)
    Web analytics injection code

  - `data.first_service_category_close` (boolean)
    First service category close flag

  - `data.map` (object)
    Map configuration

  - `data.salon_select_type_code` (string)
    Location select type code

  - `data.is_show_privacy_policy` (boolean)
    Show privacy policy flag

  - `data.is_client_agreements_feature_enabled` (boolean)
    Client agreements feature enabled flag

  - `data.specialization_display_mode` (number)
    Specialization display mode (0 - specialization, 1 - position)

  - `data.ab_test_enabled` (boolean)
    A/B test enabled flag

  - `data.ab_test_percentage` (number)
    A/B test percentage

  - `data.is_online_sale_available` (boolean)
    Online sale available flag

  - `data.legal_info` (object,null)
    Legal information

  - `data.online_sales_links` (array)
    Online sales links

  - `data.google_analytics_client_id_index` (string,null)
    Google Analytics client ID index

  - `data.brand` (object)
    Brand configuration

  - `data.injection` (object)
    Injection scripts configuration

  - `data.display_activity_type` (string)
    Display event type

  - `data.is_multiple_activity_record` (boolean)
    Multiple event appointment flag

  - `data.activity_record_count` (number)
    Event appointment count

  - `data.weekly_view_enabled` (boolean)
    Weekly view enabled flag

  - `data.show_weekly_view_without_online_booking` (boolean)
    Show weekly view without online booking

  - `data.weekly_view_default_salon_id` (number,null)
    Default location ID for weekly view

  - `data.chain_main_salon_id` (number)
    Chain main location ID

  - `data.record_type_id` (number,null)
    Appointment type ID

  - `data.features` (object)
    Feature flags

  - `data.certificate_count` (number)
    Certificate count

  - `data.abonement_count` (number)
    Membership count

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



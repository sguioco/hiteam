# Get a Booking Widget

Endpoint: GET /company/{location_id}/booking_forms/{form_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `form_id` (number, required)
    appointment widget ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

  - `Content-Type` (string, required)
    application/json

## Response 200 fields (application/json):

  - `data` (object, required)
    appointment Widget Settings

  - `data.ab_test_enabled` (boolean, required)
    Flag for enabling letterform ab-test

  - `data.button_animation` (boolean, required)
    Button animation enable flag

  - `data.button_color` (string, required)
    Button color

  - `data.button_position` (string, required)
    Button location on the page

  - `data.datetime_step_num` (number, required)
    Sequence number of date and time

  - `data.description` (string, required)
    appointment widget description

  - `data.form_position` (string, required)
    Panel position on the page

  - `data.html_code` (string, required)
    Code for inserting a button on the site

  - `data.id` (number, required)
    appointment widget ID

  - `data.is_default` (boolean, required)
    Default appointment widget flag

  - `data.master_step_default` (number, required)
    team member ID

  - `data.master_step_hide` (boolean, required)
    team member hide flag

  - `data.master_step_num` (number, required)
    Team Member serial number

  - `data.service_step_default` (number, required)
    Service ID

  - `data.service_step_hide` (boolean, required)
    Service Hiding Flag

  - `data.service_step_num` (number, required)
    Service serial number

  - `data.show_button` (boolean, required)
    Button Visibility Step

  - `data.title` (string, required)
    Name of the appointment widget

  - `data.without_menu` (boolean, required)
    Step mode flag

  - `data.is_chain` (boolean)
    Chain booking form flag

  - `data.sequence_type` (string)
    Sequence type (e.g., "steps")

  - `data.service_step_title` (string)
    Service step title

  - `data.master_step_title` (string)
    Team member step title

  - `data.specialization_display_mode` (number)
    Specialization display mode

  - `data.datetime_step_title` (string)
    Date/time step title

  - `data.html_code_v2` (string)
    Version 2 of HTML code for button insertion

  - `data.map_type` (number)
    Map type identifier

  - `data.default_language_id` (number)
    Default language ID

  - `data.group_id` (number)
    Group ID

  - `data.facebook_pixel_id` (string)
    Facebook Pixel ID

  - `data.vk_pixel_id` (string)
    VK Pixel ID

  - `data.online_sales_group_id` (number)
    Online sales group ID

  - `data.service_step_category_view_type` (string)
    Service step category view type (e.g., "horizontal_tags")

  - `data.salon_select_type_code` (string)
    Location select type code (e.g., "list")

  - `data.record_type_id` (number,null)
    Appointment type ID

  - `data.display_activity_type` (string)
    Display event type (e.g., "all")

  - `data.is_multiple_activity_record` (boolean)
    Multiple event appointment flag

  - `data.activity_record_count` (number)
    Event appointment count limit

  - `data.header_images` (object,null)
    Header images configuration

  - `data.is_weekly_view_enabled` (boolean)
    Weekly view enabled flag

  - `data.show_weekly_view_without_online_booking` (boolean)
    Show weekly view without online booking flag

  - `data.weekly_view_default_salon_id` (number,null)
    Default location ID for weekly view

  - `meta` (array, required)
    Metadata

  - `success` (boolean, required)
    Success status (true)

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



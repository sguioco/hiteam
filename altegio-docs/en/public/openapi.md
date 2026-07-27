# Online Booking

Public API for client-facing online booking integration.
This API enables third-party developers to embed online booking functionality into external platforms such as business catalogs, branded apps, and partner services.
**Base URL:** `https://api.alteg.io/api`
## Authentication
All requests require partner authorization via Bearer token in the HTTP header:
``` Authorization: Bearer <partner_token> ```
To obtain a partner token, register in the [Altegio Marketplace](https://app.alteg.io/appstore/developers/1).
## Rate Limits
- 200 requests per minute per IP address - 5 requests per second per IP address

Version: 1.0.0
License: Altegio API Agreement

## Servers

Production server
```
https://api.alteg.io/api/v1
```

## Security

### BearerPartner

Partner API token for accessing public endpoints

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}

### BearerPartnerUser

Combined partner and user tokens for authenticated user operations

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}, User {UserToken}

## Download OpenAPI description

[Online Booking](https://developer.alteg.io/_bundle/en/public/openapi.yaml)

## Authentication B2C

### Authorize Online Booking User

 - [POST /booking/auth](https://developer.alteg.io/en/public/openapi/authentication/authorize_online_booking_user.md): When a user of an online account changes their password, their API key will change and a new authorization will be required

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The visitor's phone number in the format +13155550175, or their email address. |
| password | string | Visitor password |

## Authentication

User authentication and verification endpoints for online booking

### Authorize Online Booking User

 - [POST /booking/auth](https://developer.alteg.io/en/public/openapi/authentication/authorize_online_booking_user.md): When a user of an online account changes their password, their API key will change and a new authorization will be required

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The visitor's phone number in the format +13155550175, or their email address. |
| password | string | Visitor password |

## Online Booking

Endpoints for booking form, services, staff, availability, and appointment management

### Get Booking Form Configuration

 - [GET /bookform/{id}](https://developer.alteg.io/en/public/openapi/online-booking/get_booking_form_config.md): Each Altegio client can create an unlimited number of Online Booking forms with different designs and booking scenarios.

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

### Get Internationalization Options

 - [GET /i18n/{lang_code}](https://developer.alteg.io/en/public/openapi/online-booking/get_i18n_options.md): Translation is available in one of the languages:
- Latvian - 'lv-LV'
- English - 'en-US'
- Estonian - 'ee-EE'
- Lithuanian - 'lt-LT'
- German - 'de-DE'
- Ukrainian - 'uk-UK'

### Get Services Available for Booking

 - [GET /book_services/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/get_services_available_for_booking.md): The object of services available for booking has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| categories | array of objects | Array of service categories (you can't book a category) |
| services | array of objects | Services available for booking by category |

An object from the categories array, has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Category ID |
| title | string | Category name |
| gender | number | Category belonging to gender (1 - male, 2 - female, 0 - not specified) |
| weight | number | Category weight. Categories are sorted by weight, heavier ones first |
| api_id | string | External Category ID |

An object from the services array, has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Service ID |
| title | string | Service name |
| category_id | number | Identifier of the category to which the service belongs |
| weight | number | Category weight. Services are sorted by weight, heavier ones first |
| price_min | number | The minimum cost of the service |
| price_max | number | Maximum cost of the service |
| discount | number | Service discount |
| comment | string | Comment on the service |
| active | number | Is the service active |
| prepaid | string | Online payment status |
| gender | number | Gender for which the service is provided |
| session_length | number | Service duration in seconds (only if filter by team member is set) |
| image | string | Image services |


If you need to get the services provided by a specific team member, then you need to use the filter by team member.
The following filters are available:
+ staff_id: team member ID. If you need services that only the selected team member provides
+ datetime: date (in iso8601 format). Specifies the desired appointment date. Use this parameter to retrieve services that can be booked with the selected team member on that specific date.
+ service_ids: An array of service IDs. If a team member is already selected and the time and service(s) are part of an existing appointment, this parameter should be used to select an additional service.

### Get Team Members Available for Booking

 - [GET /book_staff/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/get_team_members_available_for_booking.md): Each object from the array of team members available for booking has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | team member ID |
| name | string | team member name |
| specialization | string | team member specialization |
| position | object | team member position |
| bookable | boolean | Does the team member have sessions available for booking |
| weight | number | team member weight. When withdrawing, team members are sorted by weight, heavier first |
| show_rating | number | Whether to show team member's rating (1 - show, 0 - don't show) |
| rating | number | team member rating |
| votes_count | number | Number of votes rated team member |
| comments_count | number | Number of comments to a team member |
| avatar | string | Path to team member avatar file |
| information | string | Additional information about the team member (HTML format) |
| session_date | string | Date of the next day that there are available sessions (only for bookable = true) |


The following filters are available:

+ service_ids: Array of service IDs. If you need team members who provide only the selected service
+ datetime: date (in iso8601 format). If you need team members who have sessions for the specified service at the specified time

### Get Nearest Available Time Slots for Team Member

 - [GET /book_staff_seances/{location_id}/{team_member_id}](https://developer.alteg.io/en/public/openapi/online-booking/get_nearest_time_slots.md): the team member's nearest sessions object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| session_date | string | Next date with available sessions |
| sessions | array | List of available sessions |


The following filters are available:

+ service_ids: Array of service IDs. If you need sessions, when can you book these services
+ datetime: date (in iso8601 format) for which you want to get the next sessions

### Get Dates Available for Booking

 - [GET /book_dates/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/get_dates_available_for_booking.md): The dates available for booking object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| working_days | array of working days grouped by month | Working days of a team member/organization |
| working_dates | array of dates | An array of dates when the team member/organization works |
| booking_days | array of days when there are free sessions | Array of days that are available for booking for the specified services |
| booking_dates | array of dates | An array of dates when there are free sessions for the service to the selected team member/organization |

working days and booking_days have the same format:
month:[array of days in this month]

For example, this booking_days:
        "9": [
              "4",
              "5"]
        "10": [
              "14",
              "25"]
Means that on September 4 and 5, and on October 14 and 25 there are free sessions for booking


The following filters are available:

+ service_ids: Array of service IDs. If you need dates when you can book the specified services
+ staff_id: team member ID. If you need dates when you can book the specified team member
+ date: Date within a month, if you need dates for a specific month

### Get a List of Time Slots Available for Booking

 - [GET /book_times/{location_id}/{team_member_id}/{date}](https://developer.alteg.io/en/public/openapi/online-booking/get_time_slots_for_booking.md): The sessions available for booking object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| time | string | Session time (17:30 for example) |
| session_length | number | Session duration in seconds |
| datetime | datetime | Date and time of the session in ISO8601 format (must be passed when creating the appointment) |


The following filters are available:

+ service_ids: Array of service IDs. If you need sessions, when can you book these services

### Validate Booking Parameters

 - [POST /book_check/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/validate_booking_params.md): After generating the appointment parameters, you can validate them to ensure the appointment can be successfully created.

The JSON object containing the Online Booking parameters includes the following fields:

| Field | Type | Mandatory | Description |
| ------------- | ------------- | ------------- | ------------- |
| appointments | Array of objects | YES | Booking options (services, team members...) |

The appointments array consists of objects that have the following fields:

| Field | Type | Mandatory | Description |
| ------------- | ------------- | ------------- | ------------- |
| id | number | Yes | Appointment ID for post-save feedback (see response to request).
| services | array of numbers | NO | Array of IDs of the services the client wants to sign up for |
| staff_id | number | YES | ID of the team member the client wants to book with (0 if any team member is selected) |
| datetime | datetime | YES | Session date and time in ISO8601 format (passed for each session in the book_times resource)|


In response to the parameter check request, an empty response with the code 201 will be returned if the booking parameters are in order and bookings can be created:

If the response is JSON with an HTTP code other than 201, then the booking parameters are out of order, and bookings cannot be created.

The server may return the following errors during appointment creation:

1.  Selected time slot is already taken.
Returned with HTTP status code 422 and error code 433.

2.  No team members available for booking.
Occurs if a default team member was selected but none are available. Returned with HTTP status code 422 and error code 436.

3.  Booking time conflict within the same request.
One of the selected booking times overlaps with another booking created in the same request. Returned with HTTP status code 422 and error code 437, including the conflicting booking’s id in the appointments array.

4. Service not available for booking
The selected service is no longer available (e.g. removed by the location). Returned with HTTP status code 422 and error code 438.

### Create an Online Booking

 - [POST /book_record/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/create_online_booking.md): To create a session appointment, provide a JSON object containing the online booking parameters. The object includes the following fields:

| Field | Type | Mandatory | Description |
| ------------- | ------------- | ------------- | ------------- |
| phone | string | YES | Client's phone number (eg +13155550175) |
| full name | string | YES | Client name |
| email | string | NO | Postal address of the client |
| appointments | Array of objects | YES | Booking options (services, team members...) |
| code | string | NO | Phone number confirmation code sent via SMS (only needed if you need to confirm the number) |
| notify_by_sms | number | NO | Number of hours in advance to send an SMS reminder for the appointment (set to 0 to disable reminders). |
| notify_by_email | number | NO | Number of hours in advance to send an email reminder for the appointment (set to 0 to disable the reminder). |
| comment | string | NO | Appointment Comment |
| api_id | string | NO | External Appointment ID |

The appointments array consists of objects that have the following fields:

| Field | Type | Mandatory | Description |
| ------------- | ------------- | ------------- | ------------- |
| id | number | Yes | Appointment ID for post-save feedback (see response to request).
| services | array of numbers | NO | Array of IDs of the services the client wants to sign up for |
| staff_id | number | YES | ID of the team member the client wants to book with (0 if any team member is selected) |
| datetime | datetime | YES | Session date and time in ISO8601 format (passed for each session in the book_times resource)|
| custom_fields | key-value object | NO | Custom field values that are returned with the appointment |

Custom fields in the appointments array

When custom appointment fields are created (see the "Custom Fields" section), you can pass custom values for them during appointment creation. These fields are unique to each location.
Once the custom fields are set up, their values can be included in the optional custom_fields parameter. This should be passed as a key–value object, where each key corresponds to the code of the custom field. Example:

* location created an custom appointment field with code="my_custom_field" type="number", and a second field code="some_another_field" type="list"
*  When creating an appointment, another attribute was passed in the appointments array element: ""
appointments: [{
    ...
}, {
    ...
    custom_fields: {
    "my_custom_field": 123,
    "some_another_field": ["first value", "second value"]
    }
}]"
* When this appointment is received by the GET method later, the same value of custom fields will be returned in the response


In response to the request to create an appointment, an array of objects will come (the number of objects is equal to the number of objects in the appointments array) with the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | The appointment ID as passed in the original appointments array |
| record_id | number | The unique identifier of the appointment created in the system |
| record_hash | string | A temporary ID used for deleting the appointment immediately after creation |

Errors to be handled:
1.  Incorrect SMS verification code.
Returned with HTTP status 422 and error code 432. The SMS verification code entered by the user is invalid.

2.  Selected time slot is already taken.
Returned with HTTP status 422 and error code 433. The selected appointment time is unavailable. The response includes the id of the conflicting appointment from the appointments array.

3.  User is blacklisted.
Returned with HTTP status 403 and error code 434. The user with the specified phone number is blacklisted and cannot book an appointment.

4.  Invalid phone number format.
Returned with HTTP status 422 and error code 431. The user's phone number is not in a valid format.

5.  Missing client name.
Returned with HTTP status 422 and error code 435. The client's name was not provided.

6.  No available team members.
Returned with HTTP status 422 and error code 436. No team members are available at the selected time (commonly occurs when using a default team member setting).

7.  Overlapping appointments in request.
Returned with HTTP status 422 and error code 437. One of the selected times overlaps with another appointment in the same request. The response includes the id of the conflicting appointment from the appointments array.

### Get Online Booking Details

 - [GET /book_record/{location_id}/{record_id}/{record_hash}](https://developer.alteg.io/en/public/openapi/online-booking/get_online_booking_details.md)

### Change Online Booking Date/Time

 - [PUT /book_record/{location_id}/{record_id}](https://developer.alteg.io/en/public/openapi/online-booking/update_online_booking_datetime.md)

### Book Event

 - [POST /activity/{location_id}/{event_id}/book](https://developer.alteg.io/en/public/openapi/online-booking/book_event.md)

### Get location privacy policy for online booking

 - [GET /privacy_policy/{location_id}](https://developer.alteg.io/en/public/openapi/online-booking/get_location_privacy_policy.md): Retrieves the privacy policy configured for a specific location. This endpoint should be called before creating an online booking record to check if the location has a custom privacy policy.

If a location has a custom privacy policy configured, the online booking flow must:
- Display the policy text to the user
- Show a checkbox for accepting the privacy policy
- Only proceed with booking creation after the user has checked the acceptance checkbox

If no custom policy is configured for the location, the booking can proceed without showing any policy acceptance step.

## Client Personal Cabinet

Client account management and booking history

### Update Online Booking User Data

 - [PUT /booking/user](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/update_booking_user.md): Updating a team member’s data in online booking.

 When updating a phone number, the confirmation_code field must be included in the request. This code should be obtained using the [SMS confirmation code of the phone number to change
data](#operation/Send%20SMS%20code%20confirmation%20number%20phone%20for%20change%20data)

### Get Online Booking User Data

 - [GET /booking/user/data](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/get_booking_user.md): Retrieve online booking user data.

### Update Online Booking User Password

 - [PUT /booking/user/password](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/update_booking_user_password.md): Updating the password of an online booking user.

The response comes with a new user token.

### Send SMS Verification Code for Phone Update

 - [GET /booking/user/phone_confirmation](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/send_phone_update_verification_code.md): The request must contain one of two parameters: company_id or group_id

### Get User Appointments

 - [GET /user/records/{record_id}/{record_hash}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/get_user_appointment_list.md): The JSON Object containing the user appointment parameters has the following fields:

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

### Delete User Appointment

 - [DELETE /user/records/{record_id}/{record_hash}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/delete_user_appointment.md)

### Get appointment review

 - [GET /master_record_review/{record_token}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/get_feedback_form_status.md)

### Submit appointment review

 - [POST /master_record_review/{record_token}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/submit_feedback_form.md)


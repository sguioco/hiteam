# Client Personal Cabinet

Client account management and booking history

## Update Online Booking User Data

 - [PUT /booking/user](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/update_booking_user.md): Updating a team member’s data in online booking.

 When updating a phone number, the confirmation_code field must be included in the request. This code should be obtained using the [SMS confirmation code of the phone number to change
data](#operation/Send%20SMS%20code%20confirmation%20number%20phone%20for%20change%20data)

## Get Online Booking User Data

 - [GET /booking/user/data](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/get_booking_user.md): Retrieve online booking user data.

## Update Online Booking User Password

 - [PUT /booking/user/password](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/update_booking_user_password.md): Updating the password of an online booking user.

The response comes with a new user token.

## Send SMS Verification Code for Phone Update

 - [GET /booking/user/phone_confirmation](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/send_phone_update_verification_code.md): The request must contain one of two parameters: company_id or group_id

## Get User Appointments

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

## Delete User Appointment

 - [DELETE /user/records/{record_id}/{record_hash}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/delete_user_appointment.md)

## Get appointment review

 - [GET /master_record_review/{record_token}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/get_feedback_form_status.md)

## Submit appointment review

 - [POST /master_record_review/{record_token}](https://developer.alteg.io/en/public/openapi/client-personal-cabinet/submit_feedback_form.md)


# Create an Online Booking

To create a session appointment, provide a JSON object containing the online booking parameters. The object includes the following fields:

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

Endpoint: POST /book_record/{location_id}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `fullname` (string, required)
    Client name
    Example: "James Smith"

  - `phone` (string, required)
    Customer phone
    Example: "+13155550175"

  - `email` (string)
    Postal address of the client
    Example: "j.smith@example.com"

  - `code` (number)
    SMS confirmation code for verifying the phone number. This field is required if the location has phone_confirmation = true
    Example: 38829

  - `comment` (string)
    Commentary on the post
    Example: "test appointment!"

  - `type` (string)
    Appointment source
    Example: "mobile"

  - `notify_by_sms` (number)
    Specifies how many hours before the visit an SMS reminder should be sent to the client. Set to 0 if no reminder is needed.
    Example: 6

  - `notify_by_email` (number)
    Specifies how many hours before the visit an email reminder should be sent to the client. Set to 0 if no reminder is needed.
    Example: 24

  - `api_id` (number)
    Appointment ID from external system
    Example: 777

  - `appointments` (array)
    Appointment options (session, services, team member)
    Example: [{"id":1,"services":[331],"staff_id":6544,"datetime":"2026-09-21T23:00:00.000-05:00","custom_fields":{"my_custom_field":123,"some_another_field":["first value","next value"]}},{"id":2,"services":[99055],"staff_id":6544,"datetime":"2026-09-21T23:00:00.000-05:00","custom_fields":{"my_custom_field":456,"some_another_field":["next value","last value"]}}]

  - `appointments.id` (number)
    Appointment ID by which its hash will be returned in response

  - `appointments.services` (array)
    List of service IDs to write

  - `appointments.staff_id` (number)
    team member ID

  - `appointments.datetime` (string)
    10-01T17:00:00Z\' (required, string) - Session date and time

  - `appointments.custom_fields` (object)
    Additional appointment fields

  - `appointments.custom_fields.my_custom_field` (number)

  - `appointments.custom_fields.some_another_field` (array)

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Data (array of objects)
    Example: [{"id":1,"record_id":2820023,"record_hash":"567df655304da9b98487769426d4e76e"},{"id":2,"record_id":2820024,"record_hash":"34a45ddabdd446d5d33bdd27fbf855b2"}]

  - `data.id` (number)
    The post ID passed in the request to appontments

  - `data.record_id` (number)
    ID of the appointment in the Altegio system. Used to delete an appointment

  - `data.record_hash` (string)
    HASH appointments in the Altegio system. Used to delete an appointment by an unauthorized user immediately after appointment

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



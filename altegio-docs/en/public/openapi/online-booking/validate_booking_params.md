# Validate Booking Parameters

After generating the appointment parameters, you can validate them to ensure the appointment can be successfully created.

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

Endpoint: POST /book_check/{location_id}
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

  - `appointments` (array, required)
    appointment options (services, team members...)
    Example: [{"id":1,"services":[331],"staff_id":6544,"datetime":"2026-09-21T23:00:00.000-05:00"},{"id":2,"services":[99055],"staff_id":6544,"datetime":"2026-09-21T23:00:00.000-05:00"}]

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (null)
    Always null for this response

  - `meta` (object)
    metadata
    Example: {"message":"Created"}

  - `meta.message` (string)
    Example: "Created"

## Response 422 fields (application/json):

  - `success` (boolean)
    Execution success status (false for errors)

  - `data` (null)
    Always null for error responses

  - `meta` (object)
    metadata
    Example: {"message":"An error has occurred","errors":[{"code":422,"message":"No services or promotions set"},{"code":433,"message":"Team Member (0) cannot be booked on May 30, 2021 at 15:30. The selected time is already taken or is not working."},{"code":436,"message":"No team members available for enrollment"},{"code":437,"message":"Team Member John Doe (6544) cannot be booked for May 30, 2021 at 15:30. Intersection with previous visit."},{"code":438,"message":"There is no appointment for the specified service/promotion"}]}

  - `meta.message` (string)
    Error message
    Example: "An error has occurred"

  - `meta.errors` (array)
    Example: [{"code":422,"message":"No services or promotions set"},{"code":433,"message":"Team Member (0) cannot be booked on May 30, 2021 at 15:30. The selected time is already taken or is not working."},{"code":436,"message":"No team members available for enrollment"},{"code":437,"message":"Team Member John Doe (6544) cannot be booked for May 30, 2021 at 15:30. Intersection with previous visit."},{"code":438,"message":"There is no appointment for the specified service/promotion"}]

  - `meta.errors.code` (number)
    Internal error code

  - `meta.errors.message` (string)
    Error Description



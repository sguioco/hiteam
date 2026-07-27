# List Event Duplication Strategies

Duplication of Events occurs based on a set of parameters combined in the "duplication strategy" entity

| Field | Type | Description |
| ------------- | ------------- | ----------------------------------------- |
| title | string | Strategy name |
| repeat_mode_id| integer | Repeat mode |
| days | integer[] | List of days of the week: 0 Sun, 6 Fri |
| interval | integer | Break in searching for dates, in units of type |
| content_type | integer | Duplicate appointments? 1 - no, 2 - yes |

The repeat mode can take the values

| Meaning | Description | Break unit |
| -------- | ------------- | ------------------------------ |
| 1 | Daily | Day |
| 2 | Weekdays | - |
| 3 | Mon Wed Fri | - |
| 4 | Tue Thu | - |
| 5 | Every week | Week |
| 6 | Every month | Month |
| 7 | Every year | Year |

The days field is relevant only for mode 5 - week, for specifying specific days of repetition
If you specify repeat_mode = 5, days = [1,4], interval = 2, then the Event will be
repeat every 3rd week on Mon and Thu

Endpoint: GET /activity/{location_id}/duplication_strategy
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 4564

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

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


## Response 200 fields

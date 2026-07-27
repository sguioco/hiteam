# Leave a Comment

Endpoint: POST /comments/{location_id}/{team_member_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `team_member_id` (number, required)
    team member ID, specify when creating a review for a team member

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `mark` (number, required)
    Rating from 1 to 5
    Example: 4

  - `name` (string, required)
    Username to be displayed on the review page
    Example: "Victor"

  - `text` (string, required)
    Feedback text
    Example: "Everything is very bad!"

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":18437,"salon_id":12345,"type":1,"master_id":8864,"text":"Fine!","date":"2026-09-21T23:00:00.000-05:00","rating":4,"user_id":157169,"user_name":"Victor Sitnikov","user_avatar":"/images/no-master.png","record_id":100001}]

  - `data.id` (number)
    Comment ID

  - `data.salon_id` (number)
    location ID

  - `data.type` (number)
    1 - comment to the team member, 0 - to the location

  - `data.master_id` (number)
    Team Member ID if type = 1

  - `data.text` (string)
    Comment text

  - `data.date` (string)
    The date the comment was posted

  - `data.rating` (string)
    Rating (from 1 to 5)

  - `data.user_id` (number)
    ID of the user who left the comment

  - `data.user_name` (string)
    Name of the user who left the comment

  - `data.user_avatar` (string)
    Avatar of the user who left the comment

  - `data.record_id` (number)
    ID of the post after which the review was left

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



# List of a comments for a client

Returns a list of a comments for a client and a files in a client details uploads history.

Endpoint: GET /clients/{location_id}/clients/{client_id}/comments
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

  - `client_id` (number, required)
    ID of a location client.
    Example: 123

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (array)
    Example: [{"id":123,"create_date":"2026-01-01T12:12:12-05:00","update_date":"2026-01-01T12:12:12-05:00","type":"default","text":"Comment for a client","files":[],"user":{"id":123,"name":"John Johnson","avatar":"https://api.alteg.io/images/avatar.png"}}]

  - `data.id` (number)
    ID of a comment for a client.
    Example: 123

  - `data.create_date` (string)
    Datetime of a comment for a client created.
    Example: "2026-01-01T12:12:12-05:00"

  - `data.update_date` (string)
    Datetime of a comment for a client last updated.
    Example: "2026-01-01T12:12:12-05:00"

  - `data.type` (string)
    Type of a comment for a client:  
default: - text comment;  
file: - uploaded file.
    Enum: "default", "file"

  - `data.text` (string)
    Text of a comment for a client (type = "default", for type = "file" the text is returned empty).
    Example: "Comment for a client"

  - `data.files` (array)
    Files in a client details that triggered the comment creation (type = "file", for type = "default" the files array is returned empty).
    Example: []

  - `data.files.link` (string)
    Download link for a file in a client details.
    Example: "https://api.alteg.io/client_files/download/123/123/"

  - `data.files.filename` (string)
    Original filename for a file in a client details.
    Example: "file.pdf"

  - `data.user` (object,null)
    User created a comment for a client or uploaded files in a client details.
    Example: {"id":123,"name":"John Johnson","avatar":"https://api.alteg.io/images/avatar.png"}

  - `meta` (object)
    Additional response data.

  - `meta.count` (number)
    Response data objects count.
    Example: 10

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



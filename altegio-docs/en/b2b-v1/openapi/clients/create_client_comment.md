# Add a comment for a client

Creates a new text comment for a client.

Endpoint: POST /clients/{location_id}/clients/{client_id}/comments
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

## Request fields (application/json):

  - `text` (string, required)
    Text of a comment for a client.
    Example: "Comment for a client"

## Response 201 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Data for an existing comment for a client.

  - `data.id` (number)
    ID of a comment for a client.

  - `data.create_date` (string)
    Datetime of a comment for a client created.

  - `data.update_date` (string)
    Datetime of a comment for a client last updated.

  - `data.type` (string)
    Type of a comment for a client:  
default: - text comment;  
file: - uploaded file.
    Enum: "default", "file"

  - `data.text` (string)
    Text of a comment for a client (type = "default", for type = "file" the text is returned empty).

  - `data.files` (array)
    Files in a client details that triggered the comment creation (type = "file", for type = "default" the files array is returned empty).
    Example: [{"link":"https://api.alteg.io/client_files/download/123/123/","filename":"file.pdf"}]

  - `data.files.link` (string)
    Download link for a file in a client details.
    Example: "https://api.alteg.io/client_files/download/123/123/"

  - `data.files.filename` (string)
    Original filename for a file in a client details.
    Example: "file.pdf"

  - `data.user` (object,null)
    User created a comment for a client or uploaded files in a client details.

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.



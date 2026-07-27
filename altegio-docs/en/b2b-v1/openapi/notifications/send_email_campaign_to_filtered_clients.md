# Send email campaigns for clients matching the filters

The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| text | string | Text Email Message |
| subject | string | Email Subject |

#### Client filtering
+ fullname:'Joh' (optional, string) - Name (part of name) to filter clients
+ phone:'1315' (optional, string) - Phone (part of the number) to filter clients
+ email:'test@' (optional, string) - Email (part) for client filtering
+ card:'5663rt' (optional, string) - Card (part) to filter customers by loyalty card number

Attention: If there are no filters, email distribution will go to the entire database!

Endpoint: POST /email/clients/by_filter/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

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
    Bearer partner_token, User user_token

## Query parameters:

  - `fullname` (string)
    Name (part of the name) for client filtering
    Example: "'Joh'"

  - `phone` (string)
    Phone (part of the number) for customer filtering
    Example: "'1315'"

  - `email` (string)
    Email (part) for customer filtering
    Example: "'test@'"

## Request fields (application/json):

  - `subject` (string, required)
    Email Subject
    Example: "Important!"

  - `text` (string, required)
    Email text
    Example: "Dear clients, we congratulate you on being our clients! You are very lucky!"

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (string)
    Is null

  - `meta` (object)
    An object containing a 201 status code message
    Example: {"message":"Accepted"}

  - `meta.message` (string)
    Example: "Accepted"

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



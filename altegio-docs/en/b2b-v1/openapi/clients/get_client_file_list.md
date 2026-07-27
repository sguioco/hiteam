# Sample Request to Get a List of Client Files

A list of uploaded client files can be retrieved by providing both the location ID and the client ID in the request.
The client ID can be obtained from the client collection.

The response returns an array of client files.


Each client file has the following structure:

| Field | Type | Description |
| -----------------| ------- | -------------------------------------------------- ------------------------ |
| id | number | File ID |
| client_id | number | Client ID |
| name | string | Filename with extension |
| description | string | File description |
| extension | string | File name extension |
| mime | string | MIME file type |
| link | string | File download link |
| date_create | string | File upload date in ISO8601 format |
| size | string | Formatted file size string |
| username | string | The name of the user who uploaded the file |
| user_avatar | string | Avatar of the user who uploaded the file |
| can_edit | boolean | Is there a right to change and delete the file? true - there is a right, false - there is no right |

Endpoint: GET /company/{location_id}/clients/files/{client_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `client_id` (number, required)
    Client ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":123,"client_id":123456,"name":"test.txt","description":"","date_create":"2026-01-01T12:00:00-0500","extension":"txt","mime":"text/plain","link":"/client_files/download/456/123/","user_name":"Victor Sitnikov","user_avatar":"/images/no-master.png","size":"9 B","can_edit":false},{"id":789,"client_id":123456,"name":"photo.jpg","description":"","date_create":"2026-01-30T12:30:00-0500","extension":"jpg","mime":"image/jpeg","link":"/client_files/download/456/789/","user_name":"Victor Sitnikov","user_avatar":"/images/no-master.png","size":"96.65 KB","can_edit":true}]

  - `data.id` (number)
    File ID

  - `data.client_id` (number)
    Client ID

  - `data.name` (string)
    File name with extension

  - `data.description` (string)
    File Description

  - `data.date_create` (string)
    File upload date in ISO8601 format

  - `data.extension` (string)
    File name extension

  - `data.mime` (string)
    MIME file type

  - `data.link` (string)
    File download link

  - `data.user_name` (string)
    The name of the user who uploaded the file

  - `data.user_avatar` (string)
    Avatar of the user who uploaded the file

  - `data.size` (string)
    Formatted file size string

  - `data.can_edit` (boolean)
    Is there a right to change and delete the file? true - there is a right, false - there is no right

  - `meta` (object)
    Metadata (contains the number of files)
    Example: {"count":2}

  - `meta.count` (integer)
    Example: 2

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



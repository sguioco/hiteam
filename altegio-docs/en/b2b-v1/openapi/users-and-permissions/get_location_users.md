# Get location users

The method allows you to get users of the location.  
 location User object:

| Attribute  | Type | Description |
| ------------- | ------------- | ------------- |
|  id  |  number   | User ID   |
|  name  | string  | User name  |
|  phone  | string  | User phone |
| email  | string  | User email |
| information  | string  | User information |
|  is_approved  |  boolean | Whether the user accepted the invitation to manage the location  |
|  is_non_deletable  |  boolean  | Whether the user is non-deletable

Endpoint: GET /company/{location_id}/users
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

  - `filter[is_approved]` (number)
    Whether the user accepted the invitation to manage the location. 1 - accepted, 0 - not accepted
    Example: 1

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.
    Example: true

  - `data` (array)
    Response data.
    Example: [{"id":10,"name":"Bob","phone":"+13155550184","email":"test@gmail.com","information":"manager","is_approved":false,"is_non_deletable":false},{"id":11,"name":"Oliver","phone":"+13155550185","email":"test@gmail.com","information":"Administrator","is_approved":true,"is_non_deletable":true}]

  - `data.id` (number)
    User ID

  - `data.name` (string)
    User name

  - `data.phone` (string)
    User phone

  - `data.email` (string)
    User email

  - `data.information` (string)
    User information

  - `data.is_approved` (boolean)
    Whether the user accepted the invitation to manage the location

  - `data.is_non_deletable` (boolean)
    Whether the user is non-deletable

  - `meta` (object)
    Additional response data.
    Example: {"count":2}

  - `meta.count` (number)
    Number of users found
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



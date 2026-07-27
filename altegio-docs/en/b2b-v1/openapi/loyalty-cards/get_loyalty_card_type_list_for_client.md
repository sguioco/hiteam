# Get a List of Card Types Available for Issuance to the Client

Returns a list of card types that are available for issuance to a location client.

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Card type identifier                                                                          |
| title            | string  | Card type name                                                                                 |
| salon_group_id   | int     | ID of the chain where the card type was created                                                |
| salon_group      | object  | An object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |

Endpoint: GET /loyalty/card_types/client/{location_id}/{phone}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 12345

  - `phone` (number, required)
    Customer phone number
    Example: 13155550175

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `id` (integer)
    Card type identifier

  - `title` (string)
    Card type name

  - `salon_group_id` (integer)
    ID of the chain where the card type was created

  - `salon_group` (object)
    An object that contains the "id" and "title" fields: the identifier of the chain where the card type was created and the name of this chain

  - `salon_group.id` (integer)
    ID of the chain where the card type was created

  - `salon_group.title` (string)
    The name of the chain where the map type was created

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



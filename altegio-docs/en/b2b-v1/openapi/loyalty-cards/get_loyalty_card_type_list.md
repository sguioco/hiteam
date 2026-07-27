# Get a list of card types available at the location

Returns a list of card types that are valid for the given location.

The attributes and their descriptions match those defined in the "Collection of Card Types Available to the Client" method described above.

Endpoint: GET /loyalty/card_types/salon/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 12345

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



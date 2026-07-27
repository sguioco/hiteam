# Get a chain client by phone number.

+ Parameter
    + group_id (required, number, 43877) - ID of the location chain


#### Client filtering
+ phone:'+13155550175' (optional, string) - Phone to filter clients

Endpoint: GET /group/{chain_id}/clients
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (number, required)
    Chain ID

## Query parameters:

  - `phone` (string, required)
    Phone to filter clients, required parameter
    Example: "14264037640"

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token.User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"salon_group_id":312,"phone":"+13155550175","clients":[{"id":4240880,"company_id":4564,"name":"lx","email":"client@example.com"},{"id":4243272,"company_id":24697,"name":"lx","email":"client@example.com"}]}

  - `data.salon_group_id` (number)
    Chain ID
    Example: 312

  - `data.phone` (string)
    Customer phone
    Example: "+13155550175"

  - `data.clients` (array)
    Array of clients in chain locations
    Example: [{"id":4240880,"company_id":4564,"name":"lx","email":"client@example.com"},{"id":4243272,"company_id":24697,"name":"lx","email":"client@example.com"}]

  - `data.clients.id` (number)
    Client ID

  - `data.clients.company_id` (number)
    Location ID

  - `data.clients.name` (string)
    Client name

  - `data.clients.email` (string)
    Client Email

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 404 fields (application/json):

  - `success` (boolean)
    Execution success status

  - `data` (string)
    Contains null

  - `meta` (object)
    Object with error message
    Example: {"message":"Client not found"}

  - `meta.message` (string)
    Error message
    Example: "Client not found"



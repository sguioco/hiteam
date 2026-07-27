# Example of a request for fiscalization of a document

Endpoint: POST /https://your-api.url
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `id` (string)
    Unique ID of the sales document
    Example: "d72fece5-6825-4895-9395-0133195612a4"

  - `date` (string)
    Date and time the document was sent for printing (in ISO-8601 format)
    Example: "2026-09-21T23:00:00.000-05:00"

  - `document_id` (integer)
    Internal document identifier in the Altegio system
    Example: 239083104

  - `type` (string)
    Document type (list of possible values)
    Enum: "sale", "return"

  - `print_receipt` (boolean)
    Whether to print a paper check at the checkout during fiscalization
    Example: true

  - `customer` (object)
    Client entity
    Example: {"email":"customer@example.com","phone":"+13155550175"}

  - `customer.email` (string)
    Client Email
    Example: "customer@example.com"

  - `customer.phone` (string)
    Customer phone
    Example: "+13155550175"

  - `positions` (array)
    List of positions in the check
    Example: [{"type":"service","title":"Consultation","price":13.19,"quantity":1,"discount_amount":2.54,"vat":"ru_vat_10","payment_method":"payment","barcode":"12345"}]

  - `positions.type` (string)
    Position type ("service" - service / "commodity" - product / "payment" - payment)

  - `positions.title` (string)
    Position name

  - `positions.price` (number)
    Position price with an accuracy of 2 decimal places

  - `positions.quantity` (integer)
    Quantity

  - `positions.discount_amount` (number)
    Discount applied to a position with an accuracy of 2 decimal places

  - `positions.vat` (string)
    Type of VAT (slug from VAT list)

  - `positions.payment_method` (string)
    Settlement sign ("payment" - payment / "prepayment" - prepayment)

  - `positions.barcode` (string)
    Product barcode

  - `payments` (array)
    List of fees applied per check
    Example: [{"type":"card","sum":5.55},{"type":"cash","sum":4.55},{"type":"prepaid","sum":0.55}]

  - `payments.type` (string)
    Type of payment ("card" - non-cash payment / "cash" - cash payment / "prepaid" - advance payment)

  - `payments.sum` (number)
    Payment amount with an accuracy of 2 decimal places

  - `tax` (string)
    Type of taxation system (slug from the list of taxation systems)
    Example: "ru_osn"

  - `cashier` (object)
    The Essence of a Cashier
    Example: {"uid":"4895-9395-0133195612a4","name":"John Smith","position":"Cashier"}

  - `cashier.uid` (string)
    Cashier ID
    Example: "4895-9395-0133195612a4"

  - `cashier.name` (string)
    Cashier's name
    Example: "John Smith"

  - `cashier.position` (string)
    Cashier position (maximum line length - 64 characters)
    Example: "Cashier"

  - `pos` (object)
    Options for the connected POS terminal
    Example: {"enabled":true,"slip_count":2}

  - `pos.enabled` (boolean)
    Is it necessary to accept a card through a POS-terminal before fiscalization?
    Example: true

  - `pos.slip_count` (integer)
    Number of receipts to be printed after a successful POS transaction
    Example: 2

  - `callback_url` (string)
    Link to update fiscal status
    Example: "https://app.alteg.io/api/v1/integration/kkm/callback/"

  - `custom_text` (string)
    Arbitrary text for printing on a receipt
    Example: "some custom text"

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

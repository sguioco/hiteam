# Create a client account topup operation

Creating a transaction with a client account involves creating a document, a transaction with a client account, and a financial transaction within a single API request.

Endpoint: POST /deposits_operations/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (*/*):

  - `account_id` (number, required)
    Checkout ID for payment

  - `amount` (number, required)
    replenishment amount

  - `client_id` (number, required)
    ID of the client, the owner of the client account

  - `deposit_id` (number, required)
    client account ID

  - `master_id` (number)
    team member ID

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"document":{"id":1,"user_id":1,"salon_id":1,"type_id":9,"type":{"id":9,"title":"Account replenishment (advance payment)"},"comment":"","number":1,"salon":{"id":1,"title":"Location in New York","public_title":"Location in New York","business_group_id":1,"business_type_id":1,"country_id":7,"city_id":2,"timezone":"-5","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"http://app.alteg.io/images/icon.png","zip":"129090","phone":"+13155550175","phones":[],"site":"www.example.com","allow_delete_record":true,"allow_change_record":true},"user":{"id":1,"name":"James Smith","phone":"+13155550175"}},"deposits_transactions":[{"id":1,"salon_id":1,"salon_group_id":1,"document_id":1,"deposit_id":1,"deposit_type_id":1,"master_id":1,"user_id":1,"amount":100.5,"balance_after":12239.56,"reserved_balance_after":0,"comment":"","date_create":"2026-09-21T23:00:00.000-05:00","deleted":false,"deposit":{"id":1,"deposit_type_id":1,"salon_group_id":1,"initial_balance":10000,"balance":12239.56,"reserved_balance":0,"blocked":false,"date_create":"2026-09-21T23:00:00.000-05:00"},"deposit_type":{"id":1,"salon_group_id":1,"title":"Account type 1","date_create":"2026-09-21T23:00:00.000-05:00","deleted":false}}],"payment_transactions":[{"id":1,"document_id":1,"date":"2026-09-21T23:00:00.000-05:00","type_id":10,"expense_id":10,"account_id":1,"amount":100.5,"client_id":1,"master_id":1,"supplier_id":0,"comment":"","item_id":1,"target_type_id":0,"record_id":0,"goods_transaction_id":0,"type":{"id":10,"title":"Refill"}}]}

  - `data.document` (object)
    Example: {"id":1,"user_id":1,"salon_id":1,"type_id":9,"type":{"id":9,"title":"Account replenishment (advance payment)"},"comment":"","number":1,"salon":{"id":1,"title":"Location in New York","public_title":"Location in New York","business_group_id":1,"business_type_id":1,"country_id":7,"city_id":2,"timezone":"-5","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"http://app.alteg.io/images/icon.png","zip":"129090","phone":"+13155550175","phones":[],"site":"www.example.com","allow_delete_record":true,"allow_change_record":true},"user":{"id":1,"name":"James Smith","phone":"+13155550175"}}

  - `data.document.id` (number)
    Document ID
    Example: 1

  - `data.document.user_id` (number)
    User ID
    Example: 1

  - `data.document.salon_id` (number)
    location ID
    Example: 1

  - `data.document.type_id` (number)
    Document type identifier
    Example: 9

  - `data.document.type` (object)
    Document Type
    Example: {"id":9,"title":"Account replenishment (advance payment)"}

  - `data.document.type.id` (number)
    Document type identifier
    Example: 9

  - `data.document.type.title` (string)
    Document type name
    Example: "Account replenishment (advance payment)"

  - `data.document.comment` (string)
    A comment

  - `data.document.number` (number)
    Document Number
    Example: 1

  - `data.document.salon` (object)
    Example: {"id":1,"title":"Location in New York","public_title":"Location in New York","business_group_id":1,"business_type_id":1,"country_id":7,"city_id":2,"timezone":"-5","timezone_name":"America/New_York","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"http://app.alteg.io/images/icon.png","zip":"129090","phone":"+13155550175","phones":[],"site":"www.example.com","allow_delete_record":true,"allow_change_record":true}

  - `data.document.salon.id` (number)
    location ID
    Example: 1

  - `data.document.salon.title` (string)
    location name
    Example: "Location in New York"

  - `data.document.salon.public_title` (string)
    location name for display on external resources
    Example: "Location in New York"

  - `data.document.salon.business_group_id` (number)
    Business group ID
    Example: 1

  - `data.document.salon.business_type_id` (number)
    Business type ID
    Example: 1

  - `data.document.salon.country_id` (number)
    Identifier of the country in which the location is located
    Example: 7

  - `data.document.salon.city_id` (number)
    City ID where the location is located
    Example: 2

  - `data.document.salon.timezone` (number)
    location time zone
    Example: "-5"

  - `data.document.salon.timezone_name` (string)
    Time zone name
    Example: "America/New_York"

  - `data.document.salon.address` (string)
    Address where the location is located
    Example: "New York, 787 Jackson Drive"

  - `data.document.salon.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `data.document.salon.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `data.document.salon.logo` (string)
    The path to the image with the location logo
    Example: "http://app.alteg.io/images/icon.png"

  - `data.document.salon.zip` (string)
    Postcode
    Example: "129090"

  - `data.document.salon.phone` (string)
    Telephong
    Example: "+13155550175"

  - `data.document.salon.phones` (array)
    Phones
    Example: []

  - `data.document.salon.site` (string)
    The site of the location
    Example: "www.example.com"

  - `data.document.salon.allow_delete_record` (boolean)
    Is it possible to delete an appointment
    Example: true

  - `data.document.salon.allow_change_record` (boolean)
    Is it possible to change the appointment
    Example: true

  - `data.document.user` (object)
    User
    Example: {"id":1,"name":"James Smith","phone":"+13155550175"}

  - `data.document.user.id` (number)
    User ID
    Example: 1

  - `data.document.user.name` (string)
    Username
    Example: "James Smith"

  - `data.document.user.phone` (string)
    User phone
    Example: "+13155550175"

  - `data.deposits_transactions` (array)
    Client account transaction
    Example: [{"id":1,"salon_id":1,"salon_group_id":1,"document_id":1,"deposit_id":1,"deposit_type_id":1,"master_id":1,"user_id":1,"amount":100.5,"balance_after":12239.56,"reserved_balance_after":0,"comment":"","date_create":"2026-09-21T23:00:00.000-05:00","deleted":false,"deposit":{"id":1,"deposit_type_id":1,"salon_group_id":1,"initial_balance":10000,"balance":12239.56,"reserved_balance":0,"blocked":false,"date_create":"2026-09-21T23:00:00.000-05:00"},"deposit_type":{"id":1,"salon_group_id":1,"title":"Account type 1","date_create":"2026-09-21T23:00:00.000-05:00","deleted":false}}]

  - `data.deposits_transactions.id` (number)
    Client account transaction ID

  - `data.deposits_transactions.salon_id` (number)
    location ID

  - `data.deposits_transactions.salon_group_id` (number)
    Chain ID

  - `data.deposits_transactions.document_id` (number)
    Document ID

  - `data.deposits_transactions.deposit_id` (number)
    Personal account ID

  - `data.deposits_transactions.deposit_type_id` (number)
    Personal account type identifier

  - `data.deposits_transactions.master_id` (number)
    team member ID

  - `data.deposits_transactions.user_id` (number)
    User ID

  - `data.deposits_transactions.amount` (number)
    Top-up amount

  - `data.deposits_transactions.balance_after` (number)
    Personal account balance after this transaction

  - `data.deposits_transactions.reserved_balance_after` (number)
    Personal account reserved balance after this transaction

  - `data.deposits_transactions.comment` (string)
    A comment

  - `data.deposits_transactions.date_create` (string)
    date of creation

  - `data.deposits_transactions.deleted` (boolean)
    Has the transaction been deleted?

  - `data.deposits_transactions.date_delete` (string)
    Deletion date

  - `data.deposits_transactions.deposit` (object)
    Personal account

  - `data.deposits_transactions.deposit.id` (integer)
    Personal account ID

  - `data.deposits_transactions.deposit.deposit_type_id` (integer)
    Personal account type identifier

  - `data.deposits_transactions.deposit.salon_group_id` (integer)
    Chain ID

  - `data.deposits_transactions.deposit.initial_balance` (number)
    Starting balance

  - `data.deposits_transactions.deposit.balance` (number)
    Available balance (current balance minus reserved balance)

  - `data.deposits_transactions.deposit.reserved_balance` (number)
    Amount currently reserved by active holds

  - `data.deposits_transactions.deposit.blocked` (boolean)
    Is the personal account blocked

  - `data.deposits_transactions.deposit.date_create` (string)
    date of creation

  - `data.deposits_transactions.deposit_type` (object)
    Type of personal account

  - `data.deposits_transactions.deposit_type.id` (number)
    Personal account type identifier

  - `data.deposits_transactions.deposit_type.salon_group_id` (number)
    Chain ID

  - `data.deposits_transactions.deposit_type.title` (string)
    Name of personal account type

  - `data.deposits_transactions.deposit_type.date_create` (string)
    date of creation

  - `data.deposits_transactions.deposit_type.deleted` (boolean)
    Has the personal account type been removed?

  - `data.deposits_transactions.deposit_type.date_delete` (string)
    Deletion date

  - `data.payment_transactions` (array)
    Payment transaction
    Example: [{"id":1,"document_id":1,"date":"2026-09-21T23:00:00.000-05:00","type_id":10,"expense_id":10,"account_id":1,"amount":100.5,"client_id":1,"master_id":1,"supplier_id":0,"comment":"","item_id":1,"target_type_id":0,"record_id":0,"goods_transaction_id":0,"type":{"id":10,"title":"Refill"}}]

  - `data.payment_transactions.id` (number)
    Payment transaction ID

  - `data.payment_transactions.document_id` (integer)
    Document ID

  - `data.payment_transactions.date` (string)
    date of payment

  - `data.payment_transactions.type_id` (number)
    Document type identifier

  - `data.payment_transactions.expense_id` (number)
    Payment Item ID

  - `data.payment_transactions.account_id` (number)
    Checkout ID

  - `data.payment_transactions.amount` (number)
    Transaction amount

  - `data.payment_transactions.client_id` (number)
    Client ID

  - `data.payment_transactions.master_id` (number)
    team member ID

  - `data.payment_transactions.supplier_id` (number)
    Vendor ID

  - `data.payment_transactions.comment` (string)
    A comment

  - `data.payment_transactions.item_id` (integer)

  - `data.payment_transactions.target_type_id` (integer)

  - `data.payment_transactions.record_id` (integer)
    Appointment ID

  - `data.payment_transactions.goods_transaction_id` (integer)
    Commodity transaction ID

  - `data.payment_transactions.type` (object)

  - `data.payment_transactions.type.id` (integer)
    Transaction type identifier

  - `data.payment_transactions.type.title` (string)
    Transaction name

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



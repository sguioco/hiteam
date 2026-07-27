# Get day-end report data

+ start_date: Report date

+ team_member_id: team member ID

Endpoint: GET /reports/z_report/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (integer, required)
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

  - `start_date` (string)
    period start date
    Example: "''"

  - `master_id` (integer)
    team member ID

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"stats":{"clients":7,"clients_average":123.45,"records":14,"records_average":4231.51,"visit_records":13,"visit_records_average":100500.01,"non_visit_records":1,"non_visit_records_average":200,"targets":14,"targets_paid":10255,"goods":4,"goods_paid":12452.18,"certificates":1,"certificates_paid":9876,"abonement":0,"abonement_paid":0},"paids":{"accounts":[{"title":"Cards","amount":6987},{"title":"Cash","amount":54321.13},{"title":"Location account","amount":12531}],"discount":[{"title":"Advance Discount","amount":1816.875},{"title":"Written off bonuses","amount":800},{"title":"Promotion Discount","amount":123}],"total":{"accounts":2657.13,"discount":1241.875}},"z_data":{"1481101200":[{"client_id":11223344,"client_name":"John Smith","client_phone":"+13155550175","client_email":"","masters":[{"master_id":321123,"master_name":"Robert Brown","service":[{"item_title":"Highlighting from 9 strands","first_cost":3500,"discount":0,"result_cost":3500,"transactions":[{"accounts_amount":0,"loyalty_amount":700,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":100,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":1,"payment_type":"Card: Bonus card"}]}],"good":[{"item_title":"Spray For Hair","first_cost":15,"discount":2.25,"result_cost":12.75,"transactions":[{"accounts_amount":12.75,"loyalty_amount":0,"payment_type":"Cash"}]}],"others":{"item_title":"Other operations","first_cost":347,"discount":0,"result_cost":347,"transactions":[{"accounts_amount":23,"loyalty_amount":0,"payment_type":"Cash"},{"accounts_amount":324,"loyalty_amount":0,"payment_type":"Cash"}]}}]}]},"currency":"USD"}

  - `data.stats` (object)
    general Statistics
    Example: {"clients":7,"clients_average":123.45,"records":14,"records_average":4231.51,"visit_records":13,"visit_records_average":100500.01,"non_visit_records":1,"non_visit_records_average":200,"targets":14,"targets_paid":10255,"goods":4,"goods_paid":12452.18,"certificates":1,"certificates_paid":9876,"abonement":0,"abonement_paid":0}

  - `data.stats.clients` (integer)
    Number of clients
    Example: 7

  - `data.stats.clients_average` (number)
    Average payment per customer
    Example: 123.45

  - `data.stats.records` (integer)
    Number of records
    Example: 14

  - `data.stats.records_average` (number)
    Average pay per appointment
    Example: 4231.51

  - `data.stats.visit_records` (integer)
    Number of records with clients
    Example: 13

  - `data.stats.visit_records_average` (number)
    Average payment for records with clients
    Example: 100500.01

  - `data.stats.non_visit_records` (integer)
    Number of appointments without clients
    Example: 1

  - `data.stats.non_visit_records_average` (integer)
    Average billing for records without clients
    Example: 200

  - `data.stats.targets` (integer)
    Number of services
    Example: 14

  - `data.stats.targets_paid` (integer)
    Payment for services
    Example: 10255

  - `data.stats.goods` (integer)
    Number of products
    Example: 4

  - `data.stats.goods_paid` (number)
    Payment by products
    Example: 12452.18

  - `data.stats.certificates` (integer)
    Number of certificates
    Example: 1

  - `data.stats.certificates_paid` (integer)
    Payment for certificates
    Example: 9876

  - `data.stats.abonement` (integer)
    Number of subscriptions

  - `data.stats.abonement_paid` (integer)
    Subscription payment

  - `data.paids` (object)
    Payments
    Example: {"accounts":[{"title":"Cards","amount":6987},{"title":"Cash","amount":54321.13},{"title":"Location account","amount":12531}],"discount":[{"title":"Advance Discount","amount":1816.875},{"title":"Written off bonuses","amount":800},{"title":"Promotion Discount","amount":123}],"total":{"accounts":2657.13,"discount":1241.875}}

  - `data.paids.accounts` (array)
    Payments at the box office
    Example: [{"title":"Cards","amount":6987},{"title":"Cash","amount":54321.13},{"title":"Location account","amount":12531}]

  - `data.paids.accounts.title` (string)
    Location account name

  - `data.paids.accounts.amount` (integer)
    Sum

  - `data.paids.discount` (array)
    Payment by discount and loyalty
    Example: [{"title":"Advance Discount","amount":1816.875},{"title":"Written off bonuses","amount":800},{"title":"Promotion Discount","amount":123}]

  - `data.paids.discount.title` (string)
    Discount/promotion name

  - `data.paids.discount.amount` (number)
    Sum

  - `data.paids.total` (object)
    Outcome
    Example: {"accounts":2657.13,"discount":1241.875}

  - `data.paids.total.accounts` (number)
    Amounts for all location accounts
    Example: 2657.13

  - `data.paids.total.discount` (number)
    Amount paid by all loyalty
    Example: 1241.875

  - `data.z_data` (object)
    Data report
    Example: {"1481101200":[{"client_id":11223344,"client_name":"John Smith","client_phone":"+13155550175","client_email":"","masters":[{"master_id":321123,"master_name":"Robert Brown","service":[{"item_title":"Highlighting from 9 strands","first_cost":3500,"discount":0,"result_cost":3500,"transactions":[{"accounts_amount":0,"loyalty_amount":700,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":100,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":1,"payment_type":"Card: Bonus card"}]}],"good":[{"item_title":"Spray For Hair","first_cost":15,"discount":2.25,"result_cost":12.75,"transactions":[{"accounts_amount":12.75,"loyalty_amount":0,"payment_type":"Cash"}]}],"others":{"item_title":"Other operations","first_cost":347,"discount":0,"result_cost":347,"transactions":[{"accounts_amount":23,"loyalty_amount":0,"payment_type":"Cash"},{"accounts_amount":324,"loyalty_amount":0,"payment_type":"Cash"}]}}]}]}

  - `data.z_data.1481101200` (array)
    Example: [{"client_id":11223344,"client_name":"John Smith","client_phone":"+13155550175","client_email":"","masters":[{"master_id":321123,"master_name":"Robert Brown","service":[{"item_title":"Highlighting from 9 strands","first_cost":3500,"discount":0,"result_cost":3500,"transactions":[{"accounts_amount":0,"loyalty_amount":700,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":100,"payment_type":"Card: Gold Card"},{"accounts_amount":0,"loyalty_amount":1,"payment_type":"Card: Bonus card"}]}],"good":[{"item_title":"Spray For Hair","first_cost":15,"discount":2.25,"result_cost":12.75,"transactions":[{"accounts_amount":12.75,"loyalty_amount":0,"payment_type":"Cash"}]}],"others":{"item_title":"Other operations","first_cost":347,"discount":0,"result_cost":347,"transactions":[{"accounts_amount":23,"loyalty_amount":0,"payment_type":"Cash"},{"accounts_amount":324,"loyalty_amount":0,"payment_type":"Cash"}]}}]}]

  - `data.z_data.1481101200.client_id` (number)
    Client ID

  - `data.z_data.1481101200.client_name` (string)
    Client name

  - `data.z_data.1481101200.client_phone` (string)
    Customer phone

  - `data.z_data.1481101200.client_email` (string)
    Client's email address

  - `data.z_data.1481101200.masters` (array)
    team members

  - `data.z_data.1481101200.masters.master_id` (number)
    team member ID

  - `data.z_data.1481101200.masters.master_name` (string)
    team member name

  - `data.z_data.1481101200.masters.service` (array)
    Services

  - `data.z_data.1481101200.masters.service.item_title` (string)
    Service name

  - `data.z_data.1481101200.masters.service.first_cost` (number)
    Initial cost

  - `data.z_data.1481101200.masters.service.discount` (number)
    Discount

  - `data.z_data.1481101200.masters.service.result_cost` (number)
    the total cost

  - `data.z_data.1481101200.masters.service.transactions` (array)
    Transactions

  - `data.z_data.1481101200.masters.good` (array)
    Products

  - `data.z_data.1481101200.masters.good.item_title` (string)
    Product Name

  - `data.z_data.1481101200.masters.good.first_cost` (number)
    Initial cost

  - `data.z_data.1481101200.masters.good.discount` (number)
    Discount

  - `data.z_data.1481101200.masters.good.result_cost` (number)
    the total cost

  - `data.z_data.1481101200.masters.good.transactions` (array)
    Transactions

  - `data.z_data.1481101200.masters.others` (object)

  - `data.z_data.1481101200.masters.others.item_title` (string)
    Product/service name

  - `data.z_data.1481101200.masters.others.first_cost` (number)
    Initial cost

  - `data.z_data.1481101200.masters.others.discount` (number)
    Discount

  - `data.z_data.1481101200.masters.others.result_cost` (number)
    the total cost

  - `data.z_data.1481101200.masters.others.transactions` (array)
    Transactions

  - `data.currency` (string)
    Currency
    Example: "USD"

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



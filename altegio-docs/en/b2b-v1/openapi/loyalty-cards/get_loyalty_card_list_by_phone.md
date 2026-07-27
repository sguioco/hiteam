# Get a List of Customer Cards by Phone Number

Returns a list of customer cards with programs that are active in this location

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Loyalty card ID                                                                               |
| balance          | decimal | Loyalty card balance                                                                          |
| paid_amount      | decimal | Amount "Paid"                                                                                 |
| sold_amount      | decimal | Amount "Sold"                                                                                |
| visits_count     | int     | Number of visits                                                                              |
| number           | string  | Card number                                                                                   |
| type_id          | int     | Loyalty card type identifier                                                                  |
| salon_group_id   | int     | ID of the chain where the card was created                                                    |
| type             | object  | Object that contains the "id" and "title" fields: card type identifier and name             |
| salon_group      | object  | Object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |
| programs         | array   | Array with information about promotions linked to a loyalty card                              |
| rules            | array   | Array with information about the rules configured in the action                               |

The programs array consists of objects with the following fields:

| Attribute         | Type    | Description                                   |
|-------------------|---------|-----------------------------------------------|
| id                | int     | Promotion ID                                  |
| title             | string  | Action name                                   |
| loyalty_type_id   | int     | Promotion type ID                             |
| item_type_id      | int     | Is cashback accrued from products             |
| value_unit_id     | int     | Bonus field — Discount % or Fixed amount      |
| group_id          | int     | ID of the chain where the action was created  |
| loyalty_type      | object  | Object with information about the action      |

The rules array consists of objects with the following fields:

| Attribute           | Type    | Description                                                  |
|---------------------|---------|--------------------------------------------------------------|
| id                  | int     | Rule ID                                                      |
| loyalty_program_id  | int     | Identifier of the promotion to which the rule is attached    |
| loyalty_type_id     | int     | Promotion type ID                                            |
| value               | decimal | Value from which the rule will work                          |

Endpoint: GET /loyalty/cards/{phone}/{chain_id}/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `phone` (string, required)
    Customer phone number in the format +13155550175

  - `chain_id` (number, required)
    Chain ID

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `id` (integer)
    Loyalty card ID
    Example: 9210520

  - `balance` (number)
    Loyalty card balance
    Example: 100

  - `points` (integer)

  - `paid_amount` (number)
    Amount Paid
    Example: 1000

  - `sold_amount` (number)
    Amount "Sold"
    Example: 1000

  - `visits_count` (integer)
    Number of visits
    Example: 1

  - `number` (string)
    Card number
    Example: 14507109210520

  - `type_id` (integer)
    Loyalty card type identifier
    Example: 10992

  - `salon_group_id` (integer)
    ID of the chain where the card was created
    Example: 145071

  - `type` (object)
    An object that contains the "id" and "title" fields: card type identifier and card type name, respectively
    Example: {"id":10992,"title":"5+2","salon_group_id":145071}

  - `type.id` (integer)
    Example: 10992

  - `type.title` (string)
    Example: "5+2"

  - `type.salon_group_id` (integer)
    Example: 145071

  - `salon_group` (object)
    An object that contains the "id" and "title" fields: the identifier of the chain where the card type was created and the name of this chain
    Example: {"id":145071,"title":"Dough chain1."}

  - `salon_group.id` (integer)
    Example: 145071

  - `salon_group.title` (string)
    Example: "Dough chain1."

  - `programs` (array)
    An array with information about promotions linked to a loyalty card
    Example: [{"id":18005,"title":"5+2","value":0,"loyalty_type_id":13,"item_type_id":3,"value_unit_id":1,"group_id":145071,"loyalty_type":{"id":13,"title":"Discount for a given number of accumulated services","is_discount":true,"is_cashback":false,"is_static":false,"is_accumulative":false},"rules":[{"id":72803,"loyalty_program_id":18005,"loyalty_type_id":13,"value":20,"parameter":0},{"id":72804,"loyalty_program_id":18005,"loyalty_type_id":13,"value":10,"parameter":0},{"id":72805,"loyalty_program_id":18005,"loyalty_type_id":13,"value":100,"parameter":0}]}]

  - `programs.id` (integer)
    Promotion ID

  - `programs.title` (string)
    Share name

  - `programs.value` (integer)
    The value from which the rule will work

  - `programs.loyalty_type_id` (integer)
    Promotion type ID

  - `programs.item_type_id` (integer)
    Is cashback earned on products?

  - `programs.value_unit_id` (integer)
    Bonus field. Discount % or Fixed. sum

  - `programs.group_id` (integer)
    ID of the chain where the promotion was created

  - `programs.loyalty_type` (object)
    Object with information about the promotion

  - `programs.loyalty_type.id` (integer)
    Promotion type ID

  - `programs.loyalty_type.title` (string)
    Share type name

  - `programs.loyalty_type.is_discount` (boolean)
    Discount

  - `programs.loyalty_type.is_cashback` (boolean)
    Cashback

  - `programs.loyalty_type.is_static` (boolean)
    Fixed discount

  - `programs.loyalty_type.is_accumulative` (boolean)
    Accumulative discount

  - `programs.rules` (array)
    An array with information about the rules configured in the promotion

  - `programs.rules.id` (integer)
    Rule ID

  - `programs.rules.loyalty_program_id` (integer)
    Identifier of the stock to which the rule is attached

  - `programs.rules.loyalty_type_id` (integer)
    Promotion type ID

  - `programs.rules.value` (integer)
    The value from which the rule will work

  - `programs.rules.parameter` (integer)

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



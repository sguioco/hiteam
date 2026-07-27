# Search products and categories

### List of products and product categories

You can retrieve a list of products and product categories by providing the location ID. Use the search_term parameter to filter: 
+ Product categories by name or article 
+ Products by name, article, or barcode 

Limit the number of results using the max_count parameter.

If search_term is not provided, the response will return a list of root categories for the specified location. In this case, the max_count parameter is ignored. If search_term is provided, the system will first search among categories. If fewer than max_count results are found, the search will continue among products to fill the remaining count.

The result is returned as an array of products tree elements.


Product tree element has the following structure:

| Field | Type | Description |
| -------------| ------- | -------------------------------------------------- ----------------------------------------- |
| parent_id | number | Parent element ID (0 for root elements) |
| item_id | number | Item ID (0 if item is a category) |
| category_id | number | Product category ID (0 if the item is a product) |
| title | string | Product name or product category |
| is_chain | boolean | Is the element chain-bound? true - the element is connected to the chain, false - not connected |
| is_category | boolean | Is the element a category? true - category, false - product |
| is_item | boolean | Is the item a product? true - product, false - category |

Endpoint: GET /goods/search/{location_id}
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

  - `term` (string)
    Search query by name, article number or barcode

  - `count` (number)
    The number of output lines per page. Maximum 100

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array with data objects
    Example: [{"parent_id":0,"item_id":0,"category_id":123,"title":"Root Category 1","is_chain":true,"is_category":true,"is_item":false},{"parent_id":0,"item_id":0,"category_id":456,"title":"Root Category 2","is_chain":true,"is_category":true,"is_item":false}]

  - `data.parent_id` (number)
    Parent element ID (0 for root elements)

  - `data.item_id` (number)
    Item ID (0 if item is a category)

  - `data.category_id` (number)
    Product category ID (0 if the item is a product)

  - `data.title` (string)
    The name of the product or product category

  - `data.is_chain` (boolean)
    Is the element chain-bound? true - the element is connected to the chain, false - not connected

  - `data.is_category` (boolean)
    Is the element a category? true - category, false - product

  - `data.is_item` (boolean)
    Is the item a product? true - product, false - category

  - `meta` (object)
    Metadata (contains the number of categories found)
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



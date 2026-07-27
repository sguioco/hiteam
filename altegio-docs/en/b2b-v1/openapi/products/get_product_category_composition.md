# Example of a request to get the composition of a category

##№ Composition of the product category

Information on a product category and its descendants can be obtained by making a request specifying the location ID and product category.
Pagination is supported, specified by the page and count parameters.

Composition of a product category has the following structure:

| Field           | Type                                                                 | Description                                                                                               |
|-----------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| parent_id       | number                                                               | Parent element ID (0 for root elements)                                                                   |
| item_id         | number                                                               | Item ID (always 0)                                                                                        |
| category_id     | number                                                               | Product category ID                                                                                       |
| title           | string                                                               | Product category name                                                                                     |
| is_chain        | boolean                                                              | Is the element chain-bound? true - the element is connected to the chain, false - not connected          |
| is_category     | boolean                                                              | Is the element a category? always true                                                                    |
| is_item         | boolean                                                              | Is the item a product? always false                                                                       |
| children        | array of objects (Product tree element) | Child elements of a product category                                                                      |
| children_count  | number                                                               | Total number of child products and categories (no recursion)                                              |

Endpoint: GET /goods/category_node/{location_id}/{category_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `category_id` (number, required)
    Product Category ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `page` (number)
    Page number

  - `count` (number)
    The number of products displayed on the page. Maximum 1000

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"parent_id":0,"item_id":0,"category_id":123,"title":"Root category 1","is_chain":false,"is_category":true,"is_item":false,"children":[{"parent_id":123,"item_id":0,"category_id":456,"title":"Child category","is_chain":false,"is_category":true,"is_item":false},{"parent_id":123,"item_id":789,"category_id":0,"title":"Child product","is_chain":false,"is_category":false,"is_item":true}],"children_count":2}

  - `data.parent_id` (number)
    Parent element ID (0 for root elements)

  - `data.item_id` (number)
    Item ID (always 0)

  - `data.category_id` (number)
    Product category ID
    Example: 123

  - `data.title` (string)
    Product category name
    Example: "Root category 1"

  - `data.is_chain` (boolean)
    Is the element chain-bound? true - the element is connected to the chain, false - not connected

  - `data.is_category` (boolean)
    Is the element a category? always true
    Example: true

  - `data.is_item` (boolean)
    Is the item a product? always false

  - `data.children` (array)
    Child elements of a product category
    Example: [{"parent_id":123,"item_id":0,"category_id":456,"title":"Child category","is_chain":false,"is_category":true,"is_item":false},{"parent_id":123,"item_id":789,"category_id":0,"title":"Child product","is_chain":false,"is_category":false,"is_item":true}]

  - `data.children.parent_id` (number)
    Parent element ID (0 for root elements)

  - `data.children.item_id` (number)
    Item ID (0 if item is a category)

  - `data.children.category_id` (number)
    Product category ID (0 if the item is a product)

  - `data.children.title` (string)
    The name of the product or product category

  - `data.children.is_chain` (boolean)
    Is the element chain-bound? true - the element is connected to the chain, false - not connected

  - `data.children.is_category` (boolean)
    Is the element a category? true - category, false - product

  - `data.children.is_item` (boolean)
    Is the item a product? true - product, false - category

  - `data.children_count` (number)
    Total number of child products and categories (no recursion)
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



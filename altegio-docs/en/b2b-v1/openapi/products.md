# Products

Product catalog and categories

## Search products and categories

 - [GET /goods/search/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/search_product.md): ### List of products and product categories

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

## Get Products

 - [GET /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product.md): + term: Name, article or barcode

+ page (number, 1) - Page number (not used if product_id is passed)

+ count (number, 25) - Number of products on the page (not used if product_id is passed)

+ category_id (number, 777) - Id of the product category (not used if product_id is passed)

+ changed_after (string) - filtering products changed/created since a specific date and time (not used if product_id is passed)

+ changed_before (string) - filtering products changed/created before a specific date and time (not used if product_id is passed)

## Edit Products

 - [PUT /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/update_product.md): The method allows you to change the product parameters.
When editing units of measure for a product that already has inventory operations, you must add an array of rules for recalculating units of measure - correction_rules. Otherwise, the array is optional.

## Delete Items

 - [DELETE /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/delete_product.md): The method allows you to remove the product

## Get a list of products

 - [GET /goods/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_products_list.md): Returns a list of all products for the specified location

## Create product

 - [POST /goods/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/create_product.md): The method allows you to create a product

## Example of a request to get categories

 - [GET /company/{location_id}/goods_categories/{parent_category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_list.md)

## Example of a request to get the composition of a category

 - [GET /goods/category_node/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_composition.md): ##№ Composition of the product category

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

## Get a list of product categories by ID

 - [GET /goods_categories/multiple/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_list_by_ids.md)

## Create a Product Category

 - [POST /goods_categories/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/create_product_category.md): The method allows you to create a product category.

## Edit a Product Category

 - [PUT /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/update_product_category.md): The method allows you to edit the product category

## Delete a Product Category

 - [DELETE /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/delete_product_category.md): The method allows you to delete a product category

## Get a list of product categories (deprecated)

 - [GET /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/deprecated_get_product_category_list.md)


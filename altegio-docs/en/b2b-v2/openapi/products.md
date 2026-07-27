# Products

Product inventory management.

Retrieve Products, Product Categories, measurement Units, stock levels,
and Appointment Product Items.


## List Product Units

 - [GET /locations/{location_id}/units](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_units.md): Retrieve the measurement Units available to Products in a Location as
JSON:API resource objects. The collection contains shared system Units and
any Units configured specifically for the Location.

Use Unit IDs as sale_unit_id and consumable_unit_id in Product data.

## List Products

 - [GET /locations/{location_id}/products](https://developer.alteg.io/en/b2b-v2/openapi/products/list_products.md): Retrieve Products for a Location as JSON:API resource objects.

Pagination uses page and limit. The response includes the effective
page, calculated offset, and limit in meta.pagination.

Related data can be requested by repeating the include parameter. The
actual_cost value is returned only when requested and when the Business
User has permission to view it.

## Autocomplete Products

 - [GET /locations/{location_id}/products/autocomplete](https://developer.alteg.io/en/b2b-v2/openapi/products/autocomplete_products.md): Search Products by name, article number, or barcode.

The search term must contain at least two characters and cannot contain
emoji. Pagination uses page and limit and is returned in
meta.pagination.

## Get Product

 - [GET /locations/{location_id}/products/{product_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_product.md): Retrieve a Product for a Location as a JSON:API resource object.

Related data can be requested by repeating the include parameter. The
actual_cost value is returned only when requested and when the Business
User has permission to view it.

## List Product Storage Amounts

 - [GET /locations/{location_id}/products/{product_id}/storage_amounts](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_storage_amounts.md): Retrieve Product amounts across the Location's Storages as JSON:API
resource objects. Amounts are returned in both Sale Units and Consumable
Units.

## List Product Categories

 - [GET /locations/{location_id}/product_categories](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_categories.md): Retrieve Product Categories for a Location as JSON:API resource objects.

Omit filter[parent_category_id] or set it to 0 to return root Product
Categories. Set it to a Product Category ID to return direct children.

## Get Product Category

 - [GET /locations/{location_id}/product_categories/{product_category_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_product_category.md): Retrieve a Product Category for a Location as a JSON:API resource object.

## Get Appointment Product Item

 - [GET /locations/{location_id}/attendance_product_items/{attendance_product_item_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_attendance_product_item.md): Retrieve a Product item associated with an Appointment as a JSON:API
resource object.

The positive response shape is verified against the current PHP transformer
but has not been live-verified because the test Location has no safe fixture.


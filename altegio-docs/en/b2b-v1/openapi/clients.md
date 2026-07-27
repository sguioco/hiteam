# Clients

Client database management with comments, files, and visit history

## Adding a Client

 - [POST /clients/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/create_client.md)

## Get a list of clients

 - [POST /company/{location_id}/clients/search](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client_list.md)

## Get a client

 - [GET /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client.md)

## Edit client

 - [PUT /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/update_client.md)

## Delete client

 - [DELETE /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client.md)

## Bulk adding clients

 - [POST /clients/{location_id}/bulk](https://developer.alteg.io/en/b2b-v1/openapi/clients/bulk_create_clients.md)

## List of a comments for a client

 - [GET /clients/{location_id}/clients/{client_id}/comments](https://developer.alteg.io/en/b2b-v1/openapi/clients/list_client_comments.md): Returns a list of a comments for a client and a files in a client details uploads history.

## Add a comment for a client

 - [POST /clients/{location_id}/clients/{client_id}/comments](https://developer.alteg.io/en/b2b-v1/openapi/clients/create_client_comment.md): Creates a new text comment for a client.

## Delete a comment for a client

 - [DELETE /clients/{location_id}/clients/{client_id}/comments/{comment_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client_comment.md): Deletes a comment for a client; does not delete files uploaded that triggered creation of a comment.

## Sample Request to Get a List of Client Files

 - [GET /company/{location_id}/clients/files/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client_file_list.md): A list of uploaded client files can be retrieved by providing both the location ID and the client ID in the request.
The client ID can be obtained from the client collection.

The response returns an array of client files.


Each client file has the following structure:

| Field | Type | Description |
| -----------------| ------- | -------------------------------------------------- ------------------------ |
| id | number | File ID |
| client_id | number | Client ID |
| name | string | Filename with extension |
| description | string | File description |
| extension | string | File name extension |
| mime | string | MIME file type |
| link | string | File download link |
| date_create | string | File upload date in ISO8601 format |
| size | string | Formatted file size string |
| username | string | The name of the user who uploaded the file |
| user_avatar | string | Avatar of the user who uploaded the file |
| can_edit | boolean | Is there a right to change and delete the file? true - there is a right, false - there is no right |

## Delete request example

 - [DELETE /company/{location_id}/clients/files/{client_id}/{file_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client_file.md)

## Search by customer history

 - [POST /company/{location_id}/clients/visits/search](https://developer.alteg.io/en/b2b-v1/openapi/clients/search_client_visits.md): Displays the client’s visit history.This method returns the client’s appointment and product purchase history, grouped by visit. Data is filtered based on visit status and paid status.
The client is identified using either the client_id or client_phone parameter. All other parameters are optional. 
Results are sorted by visit date and paginated in batches of 25 items. If multiple visits share the same date as the last item on the page, they will be included on the current page to ensure complete grouping.
To retrieve the next page, use the from and to values provided in the meta field of the current response.

## Deprecated. Get a list of clients (deprecated)

 - [GET /clients/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/deprecated_get_client_list.md): + Parameter
    + company_id (required, number, 1) - location ID
    + page (number, 1) - Page number
    + count (number, 20) - Number of clients per page


#### Client filtering
+ fullname:Joh (optional, string) - Name (part of name) to filter clients
+ phone:1315 (optional, string) - Phone (part of the number) for filtering clients
+ email:test@ (optional, string) - Email (part) for client filtering
+ card:5663rt (optional, string) - Card (part) for filtering customers by loyalty card number
+ paid_min:100 (optional, number) - Minimum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ id:66 (optional, number) - ID of one client for filtering clients
+ id[]: 66 (optional, array) - IDs of multiple clients to filter
+ changed_after: '2000-01-01T00:00:00' (optional, string) - Filtering clients changed/created since a specific date and time
+ changed_before: '2020-12-31T23:59:59' (optional, string) - Filtering clients changed/created before a specific date and time


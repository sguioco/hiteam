# Chain Management

Multi-location chain operations and clients

## Obtaining chains available to the user

 - [GET /groups](https://developer.alteg.io/en/b2b-v1/openapi/chain-management/get_chain_list.md): The location chain object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location chain ID |
| title | string | Location chain name |
| locations | array | List of chain locations |
| access | object | Object with access rights for chain management |

## Get a chain client by phone number.

 - [GET /group/{chain_id}/clients](https://developer.alteg.io/en/b2b-v1/openapi/chain-management/get_chain_client_by_phone_number.md): + Parameter
    + group_id (required, number, 43877) - ID of the location chain


#### Client filtering
+ phone:'+13155550175' (optional, string) - Phone to filter clients


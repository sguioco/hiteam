# List request example

A list of tax systems and VAT available for a country can be obtained by requesting the country ID for which the list is to be obtained.
The country ID can be obtained from list of countries.

The list is an array of tax systems with a nested VAT array for each tax system.

The taxation system has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Name of taxation system |
| slug | string | Code name for the taxation system |
| vats | Array of objects(Vat[]) | List of available VAT for the taxation system |


VAT has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Title VAT |
| slug | string | Code name VAT |

Endpoint: GET /integration/kkm/references/tax_system/{country_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `country_id` (number, required)
    Country ID
    Example: 1

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"title":"General DOS","slug":"ru_osn","vats":[{"title":"0%","slug":"ru_vat_0"},{"title":"10%","slug":"ru_vat_10"},{"title":"20%","slug":"ru_vat_20"},{"title":"is not a subject to a tax","slug":"ru_vat_none"}]},{"title":"Simplified simplified tax system (Income)","slug":"ru_usn","vats":[{"title":"is not a subject to a tax","slug":"ru_vat_none"}]},{"title":"Simplified simplified tax system (Income minus Expense)","slug":"ru_usnr","vats":[{"title":"is not a subject to a tax","slug":"ru_vat_none"}]},{"title":"Single tax on imputed income UTII","slug":"ru_envd","vats":[{"title":"is not a subject to a tax","slug":"ru_vat_none"}]},{"title":"Unified agricultural tax UST","slug":"ru_esn","vats":[{"title":"is not a subject to a tax","slug":"ru_vat_none"}]},{"title":"Patent taxation system","slug":"ru_psn","vats":[{"title":"is not a subject to a tax","slug":"ru_vat_none"}]}]

  - `data.title` (string)
    Name of the taxation system

  - `data.slug` (string)
    Code name for the taxation system

  - `data.vats` (array)
    List of available VAT for the taxation system

  - `data.vats.title` (string)
    Name of VAT

  - `data.vats.slug` (string)
    VAT code name

  - `meta` (object)
    Metadata (contains the number of taxation systems found)
    Example: {"count":6}

  - `meta.count` (integer)
    Example: 6

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



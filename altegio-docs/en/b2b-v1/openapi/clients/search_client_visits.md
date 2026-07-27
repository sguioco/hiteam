# Search by customer history

Displays the client’s visit history.This method returns the client’s appointment and product purchase history, grouped by visit. Data is filtered based on visit status and paid status.
The client is identified using either the client_id or client_phone parameter. All other parameters are optional. 
Results are sorted by visit date and paginated in batches of 25 items. If multiple visits share the same date as the last item on the page, they will be included on the current page to ensure complete grouping.
To retrieve the next page, use the from and to values provided in the meta field of the current response.

Endpoint: POST /company/{location_id}/clients/visits/search
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

## Request fields (application/json):

  - `client_id` (number,null, required)
    Client ID.
    Example: 123

  - `client_phone` (string,null, required)
    Customer phone number.
    Example: 13155550184

  - `from` (string,null, required)
    Period start date.
    Example: "2022-01-31"

  - `to` (string,null, required)
    Period end date.
    Example: "2022-02-01"

  - `payment_statuses` (array, required)
    Visit payment status:  
  not_paid - the visit is not paid, no payments were made for the visit;  
  paid_not_full - the visit is partially paid;  
  paid_full - the visit is paid in full, there is no overpayment;  
  paid_over - there is an overpayment for the visit.  
If the filter by payment status is not required, then an empty array [] must be passed.
    Enum: "not_paid", "paid_not_full", "paid_full", "paid_over"

  - `attendance` (number,null, required)
    Visit status:
  -1: - the client did not come;
  0: - waiting for the client;
  1: - the client has arrived;
  2: - the client has confirmed the appointment.
    Enum: -1, 0, 1, 2

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Data on customer visits, including appointments and product sales.

  - `data.goods_transactions` (array)
    List of product sales transactions.
    Example: [{"id":123,"comment":"Comment to the sale of products","date":"2026-01-31T12:34:56-05:00","visit_id":0,"record_id":0,"goods":[{"id":123,"title":"My product","amount":-1,"unit":"PCS.","cost_per_unit":1000,"first_cost":-1000,"discount_percent":0,"cost_to_pay":1000,"paid_sum":1000,"payment_status":"paid_full"}],"staff":{"id":123,"name":"James Smith","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"team member"}},"company":{"id":123,"title":"My branch office."}}]

  - `data.goods_transactions.id` (number)
    Identifier of the transaction for the sale of products.
    Example: 123

  - `data.goods_transactions.comment` (string)
    A comment.
    Example: "Comment to the sale of products"

  - `data.goods_transactions.date` (string)
    Date of sale.
    Example: "2026-01-31T12:34:56-05:00"

  - `data.goods_transactions.visit_id` (number)
    Visit ID. Equals 0 if there is no connection to the visit.

  - `data.goods_transactions.record_id` (number)
    Appointment ID. Equals 0 if there is no link to the appointment.

  - `data.goods_transactions.goods` (array)
    List of products sold.
    Example: [{"id":123,"title":"My product","amount":-1,"unit":"PCS.","cost_per_unit":1000,"first_cost":-1000,"discount_percent":0,"cost_to_pay":1000,"paid_sum":1000,"payment_status":"paid_full"}]

  - `data.goods_transactions.goods.id` (number)
    Product ID.
    Example: 123

  - `data.goods_transactions.goods.title` (string)
    Name of product.
    Example: "My product"

  - `data.goods_transactions.goods.amount` (number)
    Number of products sold.
    Example: -1

  - `data.goods_transactions.goods.unit` (string)
    Unit of measure for the product sold.
    Example: "PCS."

  - `data.goods_transactions.goods.cost_per_unit` (number)
    Unit price without discount.
    Example: 1000

  - `data.goods_transactions.goods.first_cost` (number)
    Price of the whole product without discount.
    Example: -1000

  - `data.goods_transactions.goods.discount_percent` (number)
    Percent discount.

  - `data.goods_transactions.goods.cost_to_pay` (number)
    Price of the product including the discount.
    Example: 1000

  - `data.goods_transactions.goods.paid_sum` (number)
    Price of the product including the discount.
    Example: 1000

  - `data.goods_transactions.goods.payment_status` (string)
    Visit payment status:  
  not_paid - the visit is not paid, no payments were made for the visit;  
  paid_not_full - the visit is partially paid;  
  paid_full - the visit is paid in full, there is no overpayment;  
  paid_over - there is an overpayment for the visit.
    Enum: same as `payment_statuses` (4 values)

  - `data.goods_transactions.staff` (object)
    team member who sold the product.
    Example: {"id":123,"name":"John Johnson","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"Position"},"is_paid_staff":false}

  - `data.goods_transactions.staff.id` (number)
    ID of a team member.
    Example: 123

  - `data.goods_transactions.staff.name` (string)
    Name of a team member.
    Example: "John Johnson"

  - `data.goods_transactions.staff.company_id` (number)
    ID of a location, where team member was created.
    Example: 123

  - `data.goods_transactions.staff.specialization` (string)
    Specialization of a team member.
    Example: "Master"

  - `data.goods_transactions.staff.avatar` (string)
    Link to the avatar of a team member (small).
    Example: "https://app.alteg.io/images/no-master-sm.png"

  - `data.goods_transactions.staff.avatar_big` (string)
    Link to the avatar of a team member (original).
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.goods_transactions.staff.position` (object,null)
    Position of a team member.
    Example: {"id":123,"title":"Position"}

  - `data.goods_transactions.staff.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price.

  - `data.goods_transactions.company` (object)
    Minimum information about the store where the product was sold.
    Example: {"id":123,"title":"My branch office."}

  - `data.goods_transactions.company.id` (number)
    ID of the location location.
    Example: 123

  - `data.goods_transactions.company.title` (string)
    Name of location.
    Example: "My branch office."

  - `data.records` (array)
    List of customer appointments.
    Example: [{"id":123,"comment":"Comment to post","date":"2026-01-31T12:34:56-05:00","visit_id":123,"attendance":1,"services":[{"id":123,"title":"My service","first_cost":1000,"discount_percent":0,"cost_to_pay":1000,"paid_sum":1000,"payment_status":"paid_full","consumables":[{"title":"My consumable","amount":1,"cost_per_unit":1000,"unit":"PCS."}]}],"staff":{"id":123,"name":"James Smith","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"team member"}},"company":{"id":123,"title":"My branch office."},"tips":{"has_tips":false,"sum":null},"comer":{"id":123,"title":"James Smith","slug":"person"}}]

  - `data.records.id` (number)
    Appointment ID.
    Example: 123

  - `data.records.comment` (string)
    A comment.
    Example: "Comment to post"

  - `data.records.date` (string)
    Date of appointment.
    Example: "2026-01-31T12:34:56-05:00"

  - `data.records.visit_id` (number)
    Visit ID.
    Example: 123

  - `data.records.attendance` (number)
    Appointment status in visit
    Example: 1

  - `data.records.services` (array)
    Services in appointment.
    Example: [{"id":123,"title":"My service","first_cost":1000,"discount_percent":0,"cost_to_pay":1000,"paid_sum":1000,"payment_status":"paid_full","consumables":[{"title":"My consumable","amount":1,"cost_per_unit":1000,"unit":"PCS."}]}]

  - `data.records.services.id` (number)
    Service identifier.
    Example: 123

  - `data.records.services.title` (string)
    Name of service.
    Example: "My service"

  - `data.records.services.first_cost` (number)
    Price of service without discount.
    Example: 1000

  - `data.records.services.discount_percent` (number)
    Percent discount.

  - `data.records.services.cost_to_pay` (number)
    The cost of the service including the discount.
    Example: 1000

  - `data.records.services.paid_sum` (number)
    The amount that was paid by the customer.
    Example: 1000

  - `data.records.services.payment_status` (string)
    Visit payment status:  
  not_paid - the visit is not paid, no payments were made for the visit;  
  paid_not_full - the visit is partially paid;  
  paid_full - the visit is paid in full, there is no overpayment;  
  paid_over - there is an overpayment for the visit.
    Enum: same as `payment_statuses` (4 values)

  - `data.records.services.consumables` (array)
    Product consumables attached to this service.
    Example: [{"title":"My consumable","amount":1,"cost_per_unit":1000,"unit":"PCS."}]

  - `data.records.services.consumables.title` (string)
    Consumable name.
    Example: "My consumable"

  - `data.records.services.consumables.amount` (number)
    Quantity of the item in the unit of measure selected by the user.
    Example: 1

  - `data.records.services.consumables.cost_per_unit` (number)
    Cost per item.
    Example: 1000

  - `data.records.services.consumables.unit` (string)
    Name of the item`s unit of measurement.
    Example: "PCS."

  - `data.records.staff` (object)
    team member who provided the service.
    Example: {"id":123,"name":"John Johnson","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"Position"},"is_paid_staff":false}

  - `data.records.staff.id` (number)
    ID of a team member.
    Example: 123

  - `data.records.staff.name` (string)
    Name of a team member.
    Example: "John Johnson"

  - `data.records.staff.company_id` (number)
    ID of a location, where team member was created.
    Example: 123

  - `data.records.staff.specialization` (string)
    Specialization of a team member.
    Example: "Master"

  - `data.records.staff.avatar` (string)
    Link to the avatar of a team member (small).
    Example: "https://app.alteg.io/images/no-master-sm.png"

  - `data.records.staff.avatar_big` (string)
    Link to the avatar of a team member (original).
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.records.staff.position` (object,null)
    Position of a team member.
    Example: {"id":123,"title":"Position"}

  - `data.records.staff.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price.

  - `data.records.company` (object)
    Minimum information about the store where the item was sold.
    Example: {"id":123,"title":"My branch office."}

  - `data.records.company.id` (number)
    ID of the location location.
    Example: 123

  - `data.records.company.title` (string)
    Name of location.
    Example: "My branch office."

  - `data.records.tips` (object) — one of:
    Tipping data. Different models are used depending on whether the current user is the team member in the appointment.
    Example: {"has_tips":false,"sum":null}
    - Model object "Presence of tip without amount":
      - `has_tips` (boolean)
        Is there a tip in this appointment.
      - `sum` (number,null)
        The tip amount is not counted and is null.
    - Total tip model object:
      - `has_tips` (boolean)
        Is there a tip in this appointment.
      - `sum` (number,null)
        Amount of tip.

  - `data.records.comer` (object)
    Visitor data. If the visitor is not specified, then the field is not displayed.
    Example: {"id":123,"title":"James Smith","slug":"person"}

  - `data.records.comer.id` (number)
    Visitor ID.
    Example: 123

  - `data.records.comer.title` (string)
    Visitor name.
    Example: "James Smith"

  - `data.records.comer.slug` (string)
    visitor type:  
  person - person;  
  pet - pet;  
  vehicle - a vehicle.
    Enum: "person", "pet", "vehicle"

  - `meta` (object)
    Page navigation information containing information about the current, next, and previous pages.
The data is sorted and paginated by date in descending order.

  - `meta.dateCursor` (object)
    Pagination information.

  - `meta.dateCursor.previous` (object)
    Information about the previous page.

  - `meta.dateCursor.previous.to` (string,null)
    Up to which date, inclusive, the data on the previous page is filtered.

  - `meta.dateCursor.previous.from` (string,null)
    From what date the data on the previous page is filtered.

  - `meta.dateCursor.previous.count` (number,null)
    Number of items on the previous page.

  - `meta.dateCursor.current` (object)
    Information about the current page.

  - `meta.dateCursor.current.to` (string,null)
    Up to which date, inclusive, the data on the current page is filtered.

  - `meta.dateCursor.current.from` (string,null)
    From what date the data on the current page is filtered.

  - `meta.dateCursor.current.count` (number,null)
    Number of items on the current page.

  - `meta.dateCursor.next` (object)
    Information about the previous page.

  - `meta.dateCursor.next.to` (string,null)
    Up to which date, inclusive, the data on the next page is filtered.

  - `meta.dateCursor.next.from` (string,null)
    From what date the data on the next page is filtered.

  - `meta.dateCursor.next.count` (number,null)
    Number of items on the next page.

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

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.



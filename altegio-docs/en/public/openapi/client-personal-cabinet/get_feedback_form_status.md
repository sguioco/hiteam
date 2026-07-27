# Get appointment review

Endpoint: GET /master_record_review/{record_token}
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `record_token` (string, required)
    Short appointment token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"favicon_url":"https://www.app.alteg.io/favicon.png","is_review_submitted":false,"page_title":"Leave feedback","master":{"id":58961,"name":"Alex Johnson","company_id":28939,"specialization":"Permanent Makeup, Artistic Tattoo","rating":5,"show_rating":1,"avatar":"https://www.app.alteg.io/uploads/masters/sm/20161014151227_5360.jpg","prepaid":"forbidden","position":{"id":2185,"title":"Master PM"}},"company":{"id":28939,"title":"\"Eyes-n-Lips\" New York","logo":"https://www.app.alteg.io/uploads/s_a6f66721046345a6226ac3040a57fb7d.jpg","address":"New York, 787 Jackson Drive"},"tips":[],"record":{"id":8219891,"payed_cost":2000,"date":"2026-08-11T15:00:00-0500"},"currency":{"id":1,"iso":"USD","name":"US Dollar","symbol":"USD","is_symbol_after_amount":true},"agreement_links":{"terms_of_use":"https://www.app.alteg.io/info/terms-of-use-review-tips","confidentiality_agreement":"https://www.app.alteg.io/info/confidential"},"language":{"id":1,"locale":"en-US","iso":"usa"}}

  - `data.favicon_url` (string)
    Let to the logo
    Example: "https://www.app.alteg.io/favicon.png"

  - `data.is_review_submitted` (boolean)
    Has feedback been sent?

  - `data.page_title` (string)
    Page Title
    Example: "Leave feedback"

  - `data.master` (object)
    team member
    Example: {"id":58961,"name":"Alex Johnson","company_id":28939,"specialization":"Permanent Makeup, Artistic Tattoo","rating":5,"show_rating":1,"avatar":"https://www.app.alteg.io/uploads/masters/sm/20161014151227_5360.jpg","prepaid":"forbidden","position":{"id":2185,"title":"Master PM"}}

  - `data.master.id` (integer)
    team member ID
    Example: 58961

  - `data.master.name` (string)
    team member name
    Example: "Alex Johnson"

  - `data.master.company_id` (number)
    location ID
    Example: 28939

  - `data.master.specialization` (string)
    team member specialization
    Example: "Permanent Makeup, Artistic Tattoo"

  - `data.master.rating` (integer)
    Rating
    Example: 5

  - `data.master.show_rating` (integer)
    Number of votes
    Example: 1

  - `data.master.avatar` (string)
    Path to team member profile picture
    Example: "https://www.app.alteg.io/uploads/masters/sm/20161014151227_5360.jpg"

  - `data.master.prepaid` (string)
    Is prepayment allowed
    Example: "forbidden"

  - `data.master.position` (object)
    Position
    Example: {"id":2185,"title":"Master PM"}

  - `data.master.position.id` (number)
    Job ID
    Example: 2185

  - `data.master.position.title` (string)
    Job title
    Example: "Master PM"

  - `data.company` (object)
    location
    Example: {"id":28939,"title":"\"Eyes-n-Lips\" New York","logo":"https://www.app.alteg.io/uploads/s_a6f66721046345a6226ac3040a57fb7d.jpg","address":"New York, 787 Jackson Drive"}

  - `data.company.id` (number)
    location ID
    Example: 28939

  - `data.company.title` (string)
    location name
    Example: "\"Eyes-n-Lips\" New York"

  - `data.company.logo` (string)
    The path to the location logo
    Example: "https://www.app.alteg.io/uploads/s_a6f66721046345a6226ac3040a57fb7d.jpg"

  - `data.company.address` (string)
    Address where the location is located
    Example: "New York, 787 Jackson Drive"

  - `data.tips` (array)
    Tips
    Example: []

  - `data.record` (object)
    Recording
    Example: {"id":8219891,"payed_cost":2000,"date":"2026-08-11T15:00:00-0500"}

  - `data.record.id` (number)
    Appointment ID
    Example: 8219891

  - `data.record.payed_cost` (number)
    Paid cost
    Example: 2000

  - `data.record.date` (string)
    date
    Example: "2026-08-11T15:00:00-0500"

  - `data.currency` (object)
    location currency
    Example: {"id":1,"iso":"USD","name":"US Dollar","symbol":"USD","is_symbol_after_amount":true}

  - `data.currency.id` (number)
    Currency identifier
    Example: 1

  - `data.currency.iso` (string)
    Name in ISO format
    Example: "USD"

  - `data.currency.name` (string)
    Currency name
    Example: "US Dollar"

  - `data.currency.symbol` (string)
    Currency designation
    Example: "USD"

  - `data.currency.is_symbol_after_amount` (boolean)
    Example: true

  - `data.agreement_links` (object)
    Links to agreements
    Example: {"terms_of_use":"https://www.app.alteg.io/info/terms-of-use-review-tips","confidentiality_agreement":"https://www.app.alteg.io/info/confidential"}

  - `data.agreement_links.terms_of_use` (string)
    Processing of personal data
    Example: "https://www.app.alteg.io/info/terms-of-use-review-tips"

  - `data.agreement_links.confidentiality_agreement` (string)
    Privacy Policy
    Example: "https://www.app.alteg.io/info/confidential"

  - `data.language` (object)
    Language
    Example: {"id":1,"locale":"en-US","iso":"usa"}

  - `data.language.id` (number)
    Language ID
    Example: 1

  - `data.language.locale` (string)
    Localization
    Example: "en-US"

  - `data.language.iso` (string)
    Name in ISO format
    Example: "usa"

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



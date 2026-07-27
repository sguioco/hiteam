# Get a specific team member

Endpoint: GET /staff/{location_id}/{team_member_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `team_member_id` (number, required)
    team member ID, if you need to work with a specific team member.

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
    Example: [{"id":17969,"name":"Basil","specialization":"the hairdresser","position":{"id":1,"title":"Administrator"},"show_rating":0,"rating":0,"votes_count":0,"user_id":12345,"avatar":"https://app.alteg.io/uploads/masters/sm/20151018220924_4963.jpg","avatar_big":"https://app.alteg.io/uploads/masters/norm/20151018220924_4963.jpg","comments_count":0,"weight":"10","information":"<span><span><span>&nbsp;</span></span></span>","hidden":"0","fired":"0","status":"0","image_group":{"id":72250,"entity":"master","entity_id":26427,"images":{"sm":{"id":186817,"path":"https://app.alteg.io/uploads/masters/sm/9/90/9041171cfdabe4c_20170327202542.jpeg","width":"100","height":"100","type":"jpeg","image_group_id":72250,"version":"sm"},"norm":{"id":186818,"path":"https://app.alteg.io/uploads/masters/norm/a/aa/aa37b29b7eb322d_20170327202542.jpeg","width":"180","height":"220","type":"jpeg","image_group_id":72250,"version":"norm"},"origin":{"id":186819,"path":"https://app.alteg.io/uploads/masters/origin/6/65/654dbeb4ea0bbc3_20170327202542.jpeg","width":"800","height":"600","type":"jpeg","image_group_id":72250,"version":"origin"}}}},{"id":34006,"api_id":"42","name":"Denis","specialization":"the hairdresser","position":{},"show_rating":0,"rating":0,"votes_count":0,"user_id":12345,"avatar":"https://app.alteg.io/uploads/masters/sm/20151116091208_4369.jpg","avatar_big":"https://app.alteg.io/uploads/masters/norm/20151116091208_4369.jpg","comments_count":0,"weight":"9","information":"<span><span>&nbsp;</span></span>","hidden":"0","fired":"0","status":"0","image_group":{}},{"id":13616,"name":"Alexander","specialization":"the hairdresser","position":{},"show_rating":0,"rating":4.76921,"votes_count":0,"user_id":12345,"avatar":"https://app.alteg.io/uploads/masters/sm/20251112123913_5162.jpg","avatar_big":"https://app.alteg.io/uploads/masters/norm/20251112123913_5162.jpg","comments_count":26,"weight":"8","information":"<span><span><span>&nbsp;</span></span></span>","hidden":"0","fired":"0","status":"0","image_group":{}}]

  - `data.id` (number)
    team member ID

  - `data.api_id` (string)
    team member External ID

  - `data.name` (string)
    team member name

  - `data.specialization` (string)
    team member socialization

  - `data.position` (any)
    team member's position (empty array if not set)
    - `id` (number)
      Job ID
    - `title` (string)
      Job Title

  - `data.show_rating` (number)
    Whether to show the team member's rating (1 - show, 0 - do not show)

  - `data.rating` (number)
    team member Rating

  - `data.votes_count` (number)
    Number of votes that rated a team member

  - `data.user_id` (number,null)
    team member's linked user ID

  - `data.avatar` (string)
    Path to team member avatar file

  - `data.avatar_big` (string)
    The path to the team member's avatar file in a higher resolution

  - `data.comments_count` (number)
    Number of comments to the team member

  - `data.weight` (string)
    team member weight. team members are sorted by weight on exit, heavier first

  - `data.information` (string)
    Additional information about the team member (HTML format)

  - `data.hidden` (string)
    team member display status in online appointment booking, 1 - hidden, 0 - not hidden

  - `data.fired` (string)
    the team member's dismissal status, 1 - dismissed, 0 - not dismissed

  - `data.status` (string)
    team member deletion status, 1 - deleted, 0 - not deleted

  - `data.image_group` (object)
    Group of images of a team member

  - `data.image_group.id` (integer)

  - `data.image_group.entity` (string)

  - `data.image_group.entity_id` (integer)

  - `data.image_group.images` (object)

  - `data.image_group.images.sm` (object)

  - `data.image_group.images.sm.id` (integer)

  - `data.image_group.images.sm.path` (string)

  - `data.image_group.images.sm.width` (string)

  - `data.image_group.images.sm.height` (string)

  - `data.image_group.images.sm.type` (string)

  - `data.image_group.images.sm.image_group_id` (integer)

  - `data.image_group.images.sm.version` (string)

  - `data.image_group.images.norm` (object)

  - `data.image_group.images.norm.id` (integer)

  - `data.image_group.images.norm.path` (string)

  - `data.image_group.images.norm.width` (string)

  - `data.image_group.images.norm.height` (string)

  - `data.image_group.images.norm.type` (string)

  - `data.image_group.images.norm.image_group_id` (integer)

  - `data.image_group.images.norm.version` (string)

  - `data.image_group.images.origin` (object)

  - `data.image_group.images.origin.id` (integer)

  - `data.image_group.images.origin.path` (string)

  - `data.image_group.images.origin.width` (string)

  - `data.image_group.images.origin.height` (string)

  - `data.image_group.images.origin.type` (string)

  - `data.image_group.images.origin.image_group_id` (integer)

  - `data.image_group.images.origin.version` (string)

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



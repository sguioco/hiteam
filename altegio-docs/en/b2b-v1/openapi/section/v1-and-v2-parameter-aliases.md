## V1 and V2 parameter aliases

V1 accepts the canonical V2 terminology for query-string and request-body parameters while continuing to support legacy V1 names. This makes it possible to share request-building code between API versions. Common alias families include:

- `location_id`, `company_id`, and `salon_id`
- `chain_id`, `company_group_id`, and `salon_group_id`
- `team_member_id`, `staff_id`, and `master_id`
- `appointment_id` and `record_id`
- `product_id` and `good_id`


Singular, plural, and camelCase variants are supported where applicable. Send only one name from each alias family. If multiple aliases are supplied, explicitly supplied values are preserved and are not overwritten.
# Get a list of rights

+ Parameter
    + company_id (required, number, 1) - location ID

Endpoint: GET /user/permissions/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with access rights categories
    Example: {"timetable":{"timetable_access":true,"master_id":1000238,"position_id":0,"last_days_count":1000,"schedule_edit_access":true,"timetable_phones_access":true,"timetable_transferring_record_access":true,"timetable_statistics_access":true,"timetable_waiting_list_access":false},"record_form":{"record_form_access":true,"record_form_client_access":true,"records_autocomplete_access":true,"create_records_access":true,"edit_records_access":true,"edit_records_attendance_access":true,"records_services_cost_access":true,"records_services_discount_access":true,"record_edit_full_paid_access":true,"delete_records_access":true,"delete_customer_came_records_access":true,"delete_paid_records_access":true,"records_goods_access":true,"records_goods_create_transaction_access":true,"records_goods_create_last_days_count":-1,"records_goods_edit_transaction_access":true,"records_goods_edit_last_days_count":-1,"records_goods_cost_access":true,"records_goods_discount_access":true,"records_finances_access":true,"records_finances_last_days_count":-1,"records_finances_pay_from_deposits_access":true,"records_group_id_access":true,"records_group_id":134178,"record_form_client_add_access":true,"records_autocomplete_phone_access":true,"assistants_management_access":true,"assistants_reward_share_edit_access":true,"records_edit_last_days_count":-1,"records_edit_date_and_master_access":true,"records_edit_duration_access":true,"records_edit_comment_access":true,"records_edit_services_access":true,"records_consumables_edit_access":true,"record_edit_full_paid_client_came_access":true,"record_edit_full_paid_client_confirm_access":true,"custom_fields_client_values_read_access":true,"custom_fields_client_values_edit_access":true,"custom_fields_record_values_read_access":true,"custom_fields_record_values_edit_access":true},"finances":{"finances_access":true,"finances_accounts_ids":[],"finances_transactions_access":true,"finances_last_days_count":-1,"finances_create_transactions_access":true,"finances_create_last_days_count":-1,"finances_edit_transactions_access":true,"finances_edit_last_days_count":-1,"finances_delete_transactions_access":true,"finances_transactions_excel_access":true,"finances_expenses_ids":[],"finances_accounts_access":true,"finances_accounts_limited_access":false,"finances_accounts_banalce_access":true,"finances_suppliers_read_access":true,"finances_suppliers_create_access":true,"finances_suppliers_update_access":true,"finances_suppliers_delete_access":true,"finances_suppliers_excel_access":true,"finances_expenses_read_access":true,"expenses_read_access":true,"finances_expenses_create_access":true,"expenses_create_access":true,"finances_expenses_update_access":true,"expenses_update_access":true,"finances_expenses_delete_access":true,"expenses_delete_access":true,"finances_kkm_transactions_access":true,"kkm_transactions_accounts_access":true,"finances_kkm_settings_read_access":true,"kkm_settings_reed_access":true,"finances_kkm_settings_update_access":true,"kkm_settings_update_access":true,"finances_settings_invoicing_read_access":true,"settings_invoicing_read_access":true,"finances_settings_invoicing_update_access":true,"settings_invoicing_update_access":true,"finances_options_read_access":true,"options_read_access":true,"finances_options_update_access":true,"options_update_access":true,"finances_salary_schemes_access":true,"finances_salary_calc_access":true,"finances_salary_not_limitation_today_access":true,"finances_payroll_calculation_create_access":true,"finances_payroll_calculation_create_not_limitation_today_access":true,"finances_salary_access_master_checkbox":true,"finances_salary_access_master_id":1000237,"get_salary_access_master_id":1000237,"finances_salary_master_not_limitation_today_access":true,"finances_payroll_calculation_create_by_master_access":true,"calculation_create_by_master_not_limitation_today_access":true,"finances_period_report_access":true,"finances_period_report_excel_access":true,"finances_year_report_access":true,"finances_year_report_excel_access":true,"finances_print_check_access":true,"finances_z_report_access":true,"finances_z_report_no_limit_today_access":true,"finances_z_report_excel_access":true},"clients":{"clients_access":true,"client_phones_access":true,"clients_phones_email_access":true,"clients_card_phone_access":true,"clients_delete_access":true,"clients_excel_access":true,"excel_access":true,"client_comments_list_access":true,"client_comments_add_access":true,"client_comments_own_edit_access":true,"client_comments_other_edit_access":true,"client_files_list_access":true,"client_files_upload_access":true,"client_files_delete_access":true,"clients_visit_master_id":0,"get_visit_master_id":0,"clients_phones_access":true,"clients_edit_access":true,"clients_deposits_access":true,"clients_deposits_create_access":true,"clients_deposits_history_access":true,"clients_deposits_topup_access":true,"clients_loyalty_read_access":true,"clients_loyalty_settings_access":true,"clients_card_comment_access":true,"clients_card_comment_edit_access":true,"clients_surname_middle_name_access":true,"clients_surname_middle_name_edit_access":true,"clients_show_attendance_history_access":true},"dashboard":{"dashboard_access":true,"dash_access":true,"dash_phones_access":true,"dash_records_access":true,"dash_records_last_days_count":-1,"dash_records_excel_access":true,"dash_records_phones_access":true,"dash_message_access":true,"dash_message_excel_access":true,"dash_message_phones_access":true,"dash_reviews_access":true,"dash_reviews_delete_access":true,"dashboard_calls_access":true,"dashboard_calls_excel_access":true,"dashboard_calls_phones_access":true},"notification":{"notification":true,"web_push":true,"web_phone_push":true,"notification_sms_ending_license":true,"notification_sms_low_balance":true,"notification_email_ending_license":true},"loyalty":{"loyalty_access":true,"has_loyalty_access":true,"loyalty_cards_manual_transactions_access":true,"has_loyalty_cards_manual_transactions_access":true,"loyalty_certificate_and_abonement_manual_transactions_access":true,"loyalty_abonement_balance_edit_access":true,"loyalty_abonement_history_access":true,"loyalty_abonement_period_edit_access":true,"loyalty_cards_issue_and_removal_access":true,"loyalty_certificate_balance_edit_access":true,"loyalty_certificate_period_edit_access":true},"storages":{"storages_access":true,"storages_ids":[],"storages_transactions_access":true,"storages_last_days_count":-1,"storages_move_goods_access":true,"storages_create_transactions_access":true,"storages_create_last_days_count":-1,"storages_create_transactions_buy_access":true,"storages_create_transactions_sale_access":true,"storages_edit_transactions_access":true,"storages_edit_last_days_count":-1,"storages_edit_transactions_buy_access":true,"storages_edit_transactions_sale_access":true,"storages_delete_transactions_access":true,"storages_transactions_excel_access":true,"storages_transactions_types":[],"storages_inventory_access":true,"storages_inventory_create_edit_access":true,"storages_inventory_delete_access":true,"storages_inventory_excel_access":true,"storages_remnants_report_access":true,"storages_remnants_report_excel_access":true,"storages_sales_report_access":true,"storages_sales_report_excel_access":true,"storages_consumable_report_access":true,"storages_consumable_report_excel_access":true,"storages_write_off_report_access":true,"storages_write_off_report_excel_access":true,"storages_turnover_report_access":true,"storages_turnover_report_excel_access":true,"storages_goods_crud_access":true,"storages_goods_create_access":true,"storages_goods_update_access":true,"storages_goods_title_edit_access":true,"storages_goods_category_edit_access":true,"storages_goods_selling_price_edit_access":true,"storages_goods_cost_price_edit_access":true,"storages_goods_units_edit_access":true,"storages_goods_critical_balance_edit_access":true,"storages_goods_masses_edit_access":true,"storages_goods_comment_edit_access":true,"storages_goods_archive_access":true,"storages_goods_delete_access":true,"storages_limited_access":false,"storages_goods_prime_cost_view_access":true},"settings":{"settings_access":true,"settings_basis_access":true,"settings_information_access":true,"users_access":true,"delete_users_access":true,"create_users_access":true,"edit_users_access":true,"limited_users_access":false,"settings_services_access":true,"settings_services_create_access":true,"services_edit":true,"settings_services_edit_title_access":true,"settings_services_relation_category_access":true,"settings_services_edit_price_access":true,"settings_services_edit_image_access":true,"settings_services_edit_online_seance_date_time_access":true,"settings_services_edit_online_pay_access":true,"settings_services_edit_services_related_resource_access":true,"settings_positions_read":true,"settings_positions_create":true,"settings_positions_delete":true,"edit_master_service_and_duration":true,"tech_card_edit":true,"services_delete":true,"settings_master_access":true,"master_create":true,"master_edit":true,"master_delete":true,"settings_master_dismiss_access":true,"schedule_edit":true,"settings_notifications_access":true,"settings_email_notifications_access":true,"settings_template_notifications_access":true,"webhook_read_access":true,"settings_clients_labels_access":true,"settings_close_docs_access":true,"settings_user_notifications_access":true,"is_salon_tips_manager":false},"comers":{"comers_access":false,"comers_info_vehicle_view_access":false,"comers_info_vehicle_edit_access":false},"other":{"stat_access":true,"billing_access":true,"send_sms":true,"salon_to_salon_group_add_access":true,"analytics_constructor_access":true,"billing_invoices_access":true,"auth_enable_check_ip":false,"auth_list_allowed_ip":[]},"online_record":{"online_record_access":true,"online_record_privacy_policy_access":true},"security_access":false,"security_2fa_access":false,"security_data_changes_access":false,"security_employee_changes_access":false,"security_export_import_access":false,"security_logins_access":false}

  - `data.timetable` (object)
    Appointment log
    Example: {"timetable_access":true,"master_id":1000238,"position_id":0,"last_days_count":1000,"schedule_edit_access":true,"timetable_phones_access":true,"timetable_transferring_record_access":true,"timetable_statistics_access":true,"timetable_waiting_list_access":false}

  - `data.timetable.timetable_access` (boolean)
    true - there is access to the appointment log, false - no access
    Example: true

  - `data.timetable.master_id` (number)
    0 - if the user can view the schedule and records of all team members, otherwise only the team member whose ID is specified
    Example: 1000238

  - `data.timetable.position_id` (number)
    0 - if the user can view the schedule and records of all team members, otherwise only the position whose ID is specified

  - `data.timetable.last_days_count` (number)
    0 - do not restrict access to schedule history and records
    Example: 1000

  - `data.timetable.schedule_edit_access` (boolean)
    true - there is access to the team member's work schedule in the log, false - no access
    Example: true

  - `data.timetable.timetable_phones_access` (boolean)
    true - there is access to the phone number in the appointment log, false - no access
    Example: true

  - `data.timetable.timetable_transferring_record_access` (boolean)
    true - there is access to transferring records, false - no access
    Example: true

  - `data.timetable.timetable_statistics_access` (boolean)
    true - there is access to view statistics, false - no access
    Example: true

  - `data.timetable.timetable_waiting_list_access` (boolean)
    true - there is access to waiting list, false - no access

  - `data.record_form` (object)
    Appointment window
    Example: {"record_form_access":true,"record_form_client_access":true,"records_autocomplete_access":true,"create_records_access":true,"edit_records_access":true,"edit_records_attendance_access":true,"records_services_cost_access":true,"records_services_discount_access":true,"record_edit_full_paid_access":true,"delete_records_access":true,"delete_customer_came_records_access":true,"delete_paid_records_access":true,"records_goods_access":true,"records_goods_create_transaction_access":true,"records_goods_create_last_days_count":-1,"records_goods_edit_transaction_access":true,"records_goods_edit_last_days_count":-1,"records_goods_cost_access":true,"records_goods_discount_access":true,"records_finances_access":true,"records_finances_last_days_count":-1,"records_finances_pay_from_deposits_access":true,"records_group_id_access":true,"records_group_id":134178,"record_form_client_add_access":true,"records_autocomplete_phone_access":true,"assistants_management_access":true,"assistants_reward_share_edit_access":true,"records_edit_last_days_count":-1,"records_edit_date_and_master_access":true,"records_edit_duration_access":true,"records_edit_comment_access":true,"records_edit_services_access":true,"records_consumables_edit_access":true,"record_edit_full_paid_client_came_access":true,"record_edit_full_paid_client_confirm_access":true,"custom_fields_client_values_read_access":true,"custom_fields_client_values_edit_access":true,"custom_fields_record_values_read_access":true,"custom_fields_record_values_edit_access":true}

  - `data.record_form.record_form_access` (boolean)
    true - there is access to the appointment form, false - no access
    Example: true

  - `data.record_form.record_form_client_access` (boolean)
    true - there is access to customer data, false - no access
    Example: true

  - `data.record_form.records_autocomplete_access` (boolean)
    true - there is access to the drop-down list with customer data, false - no access
    Example: true

  - `data.record_form.create_records_access` (boolean)
    true - there is access to create appointments, false - no access to Create appointments
    Example: true

  - `data.record_form.edit_records_access` (boolean)
    true - there is access to change records, false - no access
    Example: true

  - `data.record_form.edit_records_attendance_access` (boolean)
    true - there is access to records with visit status "customer arrived", false - no access
    Example: true

  - `data.record_form.records_services_cost_access` (boolean)
    true - there is access to change the cost of services, false - no access
    Example: true

  - `data.record_form.records_services_discount_access` (boolean)
    true - there is access to change discounts for services, false - no access
    Example: true

  - `data.record_form.record_edit_full_paid_access` (boolean)
    true - there is access to edit the paid post, false - no access
    Example: true

  - `data.record_form.delete_records_access` (boolean)
    true - there is access to delete the appointment, false - no access
    Example: true

  - `data.record_form.delete_customer_came_records_access` (boolean)
    true - there is access to delete records with the "client has arrived" status, false - no access
    Example: true

  - `data.record_form.delete_paid_records_access` (boolean)
    true - there is access to delete paid appointments, false - no access
    Example: true

  - `data.record_form.records_goods_access` (boolean)
    true - there is access to product sales, false - no access
    Example: true

  - `data.record_form.records_goods_create_transaction_access` (boolean)
    true - there is access to create commodity transactions, false - no access
    Example: true

  - `data.record_form.records_goods_create_last_days_count` (number)
    -1 - access to create commodity transactions for all time, >= 0 - access to create commodity transactions for the specified number of days in the past
    Example: -1

  - `data.record_form.records_goods_edit_transaction_access` (boolean)
    true - there is access to editing commodity transactions, false - no access
    Example: true

  - `data.record_form.records_goods_edit_last_days_count` (number)
    -1 - there is access to editing commodity transactions for all time, >= 0 - access to editing commodity transactions for the specified number of days in the past''
    Example: -1

  - `data.record_form.records_goods_cost_access` (boolean)
    true - there is access to change the cost of products, false - no access
    Example: true

  - `data.record_form.records_goods_discount_access` (boolean)
    true - there is access to change product discounts, false - no access
    Example: true

  - `data.record_form.records_finances_access` (boolean)
    true - there is access to payment, false - no access
    Example: true

  - `data.record_form.records_finances_last_days_count` (number)
    -1 - there is access to making payments in records for the whole time, >= 0 - access to making payments in records for the specified number of days in the past
    Example: -1

  - `data.record_form.records_finances_pay_from_deposits_access` (boolean)
    true - there is access to making payments in records from the client's personal account, false - no access
    Example: true

  - `data.record_form.records_group_id_access` (boolean)
    true - there is access to client data over the chain, false - no access
    Example: true

  - `data.record_form.records_group_id` (number)
    ID of the chain to which there is access to customer data
    Example: 134178

  - `data.record_form.record_form_client_add_access` (boolean)
    true - there is access to add clients from appointment form, false - no access
    Example: true

  - `data.record_form.records_autocomplete_phone_access` (boolean)
    true - there is access to phone autocomplete in appointment form, false - no access
    Example: true

  - `data.record_form.assistants_management_access` (boolean)
    true - there is access to manage assistants, false - no access
    Example: true

  - `data.record_form.assistants_reward_share_edit_access` (boolean)
    true - there is access to edit assistant reward share, false - no access
    Example: true

  - `data.record_form.records_edit_last_days_count` (number)
    -1 - access to edit appointments for all time, >= 0 - access to edit appointments for the specified number of days in the past
    Example: -1

  - `data.record_form.records_edit_date_and_master_access` (boolean)
    true - there is access to edit appointment date and team member, false - no access
    Example: true

  - `data.record_form.records_edit_duration_access` (boolean)
    true - there is access to edit appointment duration, false - no access
    Example: true

  - `data.record_form.records_edit_comment_access` (boolean)
    true - there is access to edit appointment comment, false - no access
    Example: true

  - `data.record_form.records_edit_services_access` (boolean)
    true - there is access to edit appointment services, false - no access
    Example: true

  - `data.record_form.records_consumables_edit_access` (boolean)
    true - there is access to edit appointment consumables, false - no access
    Example: true

  - `data.record_form.record_edit_full_paid_client_came_access` (boolean)
    true - there is access to edit fully paid appointments with client arrived status, false - no access
    Example: true

  - `data.record_form.record_edit_full_paid_client_confirm_access` (boolean)
    true - there is access to edit fully paid appointments with client confirmed status, false - no access
    Example: true

  - `data.record_form.custom_fields_client_values_read_access` (boolean)
    true - there is access to read client custom field values, false - no access
    Example: true

  - `data.record_form.custom_fields_client_values_edit_access` (boolean)
    true - there is access to edit client custom field values, false - no access
    Example: true

  - `data.record_form.custom_fields_record_values_read_access` (boolean)
    true - there is access to read appointment custom field values, false - no access
    Example: true

  - `data.record_form.custom_fields_record_values_edit_access` (boolean)
    true - there is access to edit appointment custom field values, false - no access
    Example: true

  - `data.finances` (object)
    Section Finance
    Example: {"finances_access":true,"finances_accounts_ids":[],"finances_transactions_access":true,"finances_last_days_count":-1,"finances_create_transactions_access":true,"finances_create_last_days_count":-1,"finances_edit_transactions_access":true,"finances_edit_last_days_count":-1,"finances_delete_transactions_access":true,"finances_transactions_excel_access":true,"finances_expenses_ids":[],"finances_accounts_access":true,"finances_accounts_limited_access":false,"finances_accounts_banalce_access":true,"finances_suppliers_read_access":true,"finances_suppliers_create_access":true,"finances_suppliers_update_access":true,"finances_suppliers_delete_access":true,"finances_suppliers_excel_access":true,"finances_expenses_read_access":true,"expenses_read_access":true,"finances_expenses_create_access":true,"expenses_create_access":true,"finances_expenses_update_access":true,"expenses_update_access":true,"finances_expenses_delete_access":true,"expenses_delete_access":true,"finances_kkm_transactions_access":true,"kkm_transactions_accounts_access":true,"finances_kkm_settings_read_access":true,"kkm_settings_reed_access":true,"finances_kkm_settings_update_access":true,"kkm_settings_update_access":true,"finances_settings_invoicing_read_access":true,"settings_invoicing_read_access":true,"finances_settings_invoicing_update_access":true,"settings_invoicing_update_access":true,"finances_options_read_access":true,"options_read_access":true,"finances_options_update_access":true,"options_update_access":true,"finances_salary_schemes_access":true,"finances_salary_calc_access":true,"finances_salary_not_limitation_today_access":true,"finances_payroll_calculation_create_access":true,"finances_payroll_calculation_create_not_limitation_today_access":true,"finances_salary_access_master_checkbox":true,"finances_salary_access_master_id":1000237,"get_salary_access_master_id":1000237,"finances_salary_master_not_limitation_today_access":true,"finances_payroll_calculation_create_by_master_access":true,"calculation_create_by_master_not_limitation_today_access":true,"finances_period_report_access":true,"finances_period_report_excel_access":true,"finances_year_report_access":true,"finances_year_report_excel_access":true,"finances_print_check_access":true,"finances_z_report_access":true,"finances_z_report_no_limit_today_access":true,"finances_z_report_excel_access":true}

  - `data.finances.finances_access` (boolean)
    true - there is access to finances, false - no access
    Example: true

  - `data.finances.finances_accounts_ids` (array)
    array of IDs to selected checkouts
    Example: []

  - `data.finances.finances_transactions_access` (boolean)
    true - there is access to view funds movements, false - no access
    Example: true

  - `data.finances.finances_last_days_count` (number)
    -1 - access to view funds movements for the whole time, >= 0 - access to view funds movements for the specified number of days in the past
    Example: -1

  - `data.finances.finances_create_transactions_access` (boolean)
    true - there is access to create transactions, false - no access
    Example: true

  - `data.finances.finances_create_last_days_count` (number)
    -1 - there is access to create transactions for all time, >= 0 - access to create transactions for the specified number of days in the past
    Example: -1

  - `data.finances.finances_edit_transactions_access` (boolean)
    true - there is access to editing transactions, false - no access
    Example: true

  - `data.finances.finances_edit_last_days_count` (number)
    -1 - there is access to editing transactions for all time, >= 0 - access to editing transactions for the specified number of days in the past
    Example: -1

  - `data.finances.finances_delete_transactions_access` (boolean)
    true - there is access to delete transactions, false - no access
    Example: true

  - `data.finances.finances_transactions_excel_access` (boolean)
    true - there is access to unloading cash flows in Excel, false - no access
    Example: true

  - `data.finances.finances_expenses_ids` (array)
    true - there is access to transfers between location accounts, false - no access
    Example: []

  - `data.finances.finances_accounts_access` (boolean)
    true - there is access to accounts and location accounts, false - no access
    Example: true

  - `data.finances.finances_accounts_limited_access` (boolean)
    true - there is limited access to accounts, false - no access

  - `data.finances.finances_accounts_banalce_access` (boolean)
    true - there is access to the balance, false - no access
    Example: true

  - `data.finances.finances_suppliers_read_access` (boolean)
    true - there is access to counterparties, false - no access
    Example: true

  - `data.finances.finances_suppliers_create_access` (boolean)
    true - there is access to create counterparties, false - no access
    Example: true

  - `data.finances.finances_suppliers_update_access` (boolean)
    true - there is access to change counterparties, false - no access
    Example: true

  - `data.finances.finances_suppliers_delete_access` (boolean)
    true - there is access to deleting counterparties, false - no access
    Example: true

  - `data.finances.finances_suppliers_excel_access` (boolean)
    true - there is access to export to Excel, false - no access
    Example: true

  - `data.finances.finances_expenses_read_access` (boolean)
    true - there is access to the payment item, false - no access
    Example: true

  - `data.finances.expenses_read_access` (boolean)
    true - there is access to the payment item, false - no access
    Example: true

  - `data.finances.finances_expenses_create_access` (boolean)
    true - there is access to create a payment item, false - no access
    Example: true

  - `data.finances.expenses_create_access` (boolean)
    true - there is access to create a payment item, false - no access
    Example: true

  - `data.finances.finances_expenses_update_access` (boolean)
    true - there is access to change the payment item, false - no access
    Example: true

  - `data.finances.expenses_update_access` (boolean)
    true - there is access to change the payment item, false - no access
    Example: true

  - `data.finances.finances_expenses_delete_access` (boolean)
    true - there is access to deleting a payment item, false - no access
    Example: true

  - `data.finances.expenses_delete_access` (boolean)
    true - there is access to deleting a payment item, false - no access
    Example: true

  - `data.finances.finances_kkm_transactions_access` (boolean)
    true - there is access to operations with KKM, false - no access
    Example: true

  - `data.finances.kkm_transactions_accounts_access` (boolean)
    true - there is access to operations with KKM, false - no access
    Example: true

  - `data.finances.finances_kkm_settings_read_access` (boolean)
    true - access to KKM settings, false - no access
    Example: true

  - `data.finances.kkm_settings_reed_access` (boolean)
    true - access to KKM settings, false - no access
    Example: true

  - `data.finances.finances_kkm_settings_update_access` (boolean)
    true - there is access to change KKM, false - no access
    Example: true

  - `data.finances.kkm_settings_update_access` (boolean)
    true - there is access to change KKM, false - no access
    Example: true

  - `data.finances.finances_settings_invoicing_read_access` (boolean)
    true - there is access to online payments, false - no access
    Example: true

  - `data.finances.finances_settings_invoicing_update_access` (boolean)
    true - there is access to change online payments, false - no access
    Example: true

  - `data.finances.settings_invoicing_read_access` (boolean)
    true - there is access to online payments, false - no access
    Example: true

  - `data.finances.settings_invoicing_update_access` (boolean)
    true - there is access to change online payments, false - no access
    Example: true

  - `data.finances.finances_options_read_access` (boolean)
    true - there is access to payment settings, false - no access
    Example: true

  - `data.finances.options_read_access` (boolean)
    true - there is access to read payment options, false - no access
    Example: true

  - `data.finances.finances_options_update_access` (boolean)
    true - there is access to change payment settings, false - no access
    Example: true

  - `data.finances.options_update_access` (boolean)
    true - there is access to change payment settings, false - no access
    Example: true

  - `data.finances.finances_salary_schemes_access` (boolean)
    true - there is access to payroll schemes, false - no access
    Example: true

  - `data.finances.finances_salary_calc_access` (boolean)
    true - there is access to payroll, false - no access
    Example: true

  - `data.finances.finances_salary_not_limitation_today_access` (boolean)
    true - there is access to payroll, false - access to payroll for the current day
    Example: true

  - `data.finances.finances_payroll_calculation_create_access` (boolean)
    true - there is access to payroll, false - no access
    Example: true

  - `data.finances.finances_payroll_calculation_create_not_limitation_today_access` (boolean)
    true - there is access to payroll, false - access to payroll for the current day
    Example: true

  - `data.finances.finances_salary_access_master_checkbox` (boolean)
    true - only a specific team member has access to payroll, false - full access
    Example: true

  - `data.finances.finances_salary_access_master_id` (number)
    ID of the team member to whom you have access to payroll
    Example: 1000237

  - `data.finances.get_salary_access_master_id` (number)
    ID of the team member to whom you have access to payroll
    Example: 1000237

  - `data.finances.finances_salary_master_not_limitation_today_access` (boolean)
    true - do not restrict to the current day, false - access only for today
    Example: true

  - `data.finances.finances_payroll_calculation_create_by_master_access` (boolean)
    true - there is access to payroll for a specific team member, false - no restrictions
    Example: true

  - `data.finances.calculation_create_by_master_not_limitation_today_access` (boolean)
    true - there is access to payroll, false - no access
    Example: true

  - `data.finances.finances_period_report_access` (boolean)
    true - there is access to the report for the period, false - no access
    Example: true

  - `data.finances.finances_period_report_excel_access` (boolean)
    true - there is access to uploading a report for the period to Excel, false - no access
    Example: true

  - `data.finances.finances_year_report_access` (boolean)
    true - there is access to the annual report, false - no access
    Example: true

  - `data.finances.finances_year_report_excel_access` (boolean)
    true - there is access to exporting the annual report to Excel, false - no access
    Example: true

  - `data.finances.finances_print_check_access` (boolean)
    true - there is access to receipt printing, false - no access
    Example: true

  - `data.finances.finances_z_report_access` (boolean)
    true - there is access to the daily location account report, false - no access
    Example: true

  - `data.finances.finances_z_report_no_limit_today_access` (boolean)
    true - there is access to the location account report, false - access to the location account report for the current day
    Example: true

  - `data.finances.finances_z_report_excel_access` (boolean)
    true - there is access to export to Excel, false - no access
    Example: true

  - `data.clients` (object)
    Section Clients
    Example: {"clients_access":true,"client_phones_access":true,"clients_phones_email_access":true,"clients_card_phone_access":true,"clients_delete_access":true,"clients_excel_access":true,"excel_access":true,"client_comments_list_access":true,"client_comments_add_access":true,"client_comments_own_edit_access":true,"client_comments_other_edit_access":true,"client_files_list_access":true,"client_files_upload_access":true,"client_files_delete_access":true,"clients_visit_master_id":0,"get_visit_master_id":0,"clients_phones_access":true,"clients_edit_access":true,"clients_deposits_access":true,"clients_deposits_create_access":true,"clients_deposits_history_access":true,"clients_deposits_topup_access":true,"clients_loyalty_read_access":true,"clients_loyalty_settings_access":true,"clients_card_comment_access":true,"clients_card_comment_edit_access":true,"clients_surname_middle_name_access":true,"clients_surname_middle_name_edit_access":true,"clients_show_attendance_history_access":true}

  - `data.clients.clients_access` (boolean)
    true - there is access to the client base, false - no access
    Example: true

  - `data.clients.client_phones_access` (boolean)
    true - there is access to phone numbers in the list of clients, false - no access
    Example: true

  - `data.clients.clients_phones_email_access` (boolean)
    true - there is access to phone numbers and emails in the list of clients, false - no access
    Example: true

  - `data.clients.clients_card_phone_access` (boolean)
    true - there is access to phones in the client card, false - no access
    Example: true

  - `data.clients.clients_delete_access` (boolean)
    true - there is access to delete clients, false - no access
    Example: true

  - `data.clients.clients_excel_access` (boolean)
    true - there is access to unloading the list of clients in Excel, false - no access
    Example: true

  - `data.clients.excel_access` (boolean)
    1 - there is access to unloading the list of clients in Excel, 0 - no access
    Example: true

  - `data.clients.client_comments_list_access` (boolean)
    true - there is access to view comments, false - no access
    Example: true

  - `data.clients.client_comments_add_access` (boolean)
    true - there is access to add comments, false - no access
    Example: true

  - `data.clients.client_comments_own_edit_access` (boolean)
    true - you have access to change/delete your comments, false - no access
    Example: true

  - `data.clients.client_comments_other_edit_access` (boolean)
    true - there is access to change/delete other people's comments, false - no access
    Example: true

  - `data.clients.client_files_list_access` (boolean)
    true - there is access to view and download files, false - no access
    Example: true

  - `data.clients.client_files_upload_access` (boolean)
    true - there is access to upload files, false - no access
    Example: true

  - `data.clients.client_files_delete_access` (boolean)
    true - there is access to delete files, false - no access
    Example: true

  - `data.clients.clients_visit_master_id` (number)
    ID of the team member by which you can see the clients who visited the team member, 0 - no restrictions

  - `data.clients.get_visit_master_id` (number)
    ID of the team member by which you can see the clients who visited the team member, 0 - no restrictions

  - `data.clients.clients_phones_access` (boolean)
    true - there is access to client phones, false - no access
    Example: true

  - `data.clients.clients_edit_access` (boolean)
    true - there is access to edit clients, false - no access
    Example: true

  - `data.clients.clients_deposits_access` (boolean)
    true - there is access to client accounts, false - no access
    Example: true

  - `data.clients.clients_deposits_create_access` (boolean)
    true - there is access to create client accounts, false - no access
    Example: true

  - `data.clients.clients_deposits_history_access` (boolean)
    true - there is access to client account history, false - no access
    Example: true

  - `data.clients.clients_deposits_topup_access` (boolean)
    true - there is access to top up client accounts, false - no access
    Example: true

  - `data.clients.clients_loyalty_read_access` (boolean)
    true - there is access to read client loyalty data, false - no access
    Example: true

  - `data.clients.clients_loyalty_settings_access` (boolean)
    true - there is access to client loyalty settings, false - no access
    Example: true

  - `data.clients.clients_card_comment_access` (boolean)
    true - there is access to view client card comments, false - no access
    Example: true

  - `data.clients.clients_card_comment_edit_access` (boolean)
    true - there is access to edit client card comments, false - no access
    Example: true

  - `data.clients.clients_surname_middle_name_access` (boolean)
    true - there is access to view client surname and middle_name, false - no access
    Example: true

  - `data.clients.clients_surname_patronymic_access` (boolean)
    true - there is access to view client surname and legacy middle-name field, false - no access

  - `data.clients.clients_surname_middle_name_edit_access` (boolean)
    true - there is access to edit client surname and middle_name, false - no access
    Example: true

  - `data.clients.clients_surname_patronymic_edit_access` (boolean)
    true - there is access to edit client surname and legacy middle-name field, false - no access

  - `data.clients.clients_show_attendance_history_access` (boolean)
    true - there is access to show client attendance history, false - no access
    Example: true

  - `data.dashboard` (object)
    Section Overview
    Example: {"dashboard_access":true,"dash_access":true,"dash_phones_access":true,"dash_records_access":true,"dash_records_last_days_count":-1,"dash_records_excel_access":true,"dash_records_phones_access":true,"dash_message_access":true,"dash_message_excel_access":true,"dash_message_phones_access":true,"dash_reviews_access":true,"dash_reviews_delete_access":true,"dashboard_calls_access":true,"dashboard_calls_excel_access":true,"dashboard_calls_phones_access":true}

  - `data.dashboard.dashboard_access` (boolean)
    true - there is access to the overview section, false - no access
    Example: true

  - `data.dashboard.dash_access` (boolean)
    true - there is access to the summary section, false - no access
    Example: true

  - `data.dashboard.dash_phones_access` (boolean)
    true - there is access to display phone numbers in the summary, false - no access
    Example: true

  - `data.dashboard.dash_records_access` (boolean)
    true - there is access to view the list of records, false - no access
    Example: true

  - `data.dashboard.dash_records_last_days_count` (number)
    -1 - access to view the list of records for all time, >= 0 - access to view the list of records for the specified number of days in the past
    Example: -1

  - `data.dashboard.dash_records_excel_access` (boolean)
    true - there is access to unload the list of records in Excel, false - no access
    Example: true

  - `data.dashboard.dash_records_phones_access` (boolean)
    true - there is access to display phone numbers in appointments, false - no access
    Example: true

  - `data.dashboard.dash_message_access` (boolean)
    true - there is access to view message details, false - no access
    Example: true

  - `data.dashboard.dash_message_excel_access` (boolean)
    true - there is access to unload message details in Excel, false - no access
    Example: true

  - `data.dashboard.dash_message_phones_access` (boolean)
    true - there is access to show phone numbers in messages, false - no access
    Example: true

  - `data.dashboard.dash_reviews_access` (boolean)
    true - there is access to view reviews, false - no access
    Example: true

  - `data.dashboard.dash_reviews_delete_access` (boolean)
    true - there is access to delete reviews, false - no access
    Example: true

  - `data.dashboard.dashboard_calls_access` (boolean)
    true - there is access to the calls section, false - no access
    Example: true

  - `data.dashboard.dashboard_calls_excel_access` (boolean)
    true - there is access to unloading Excel calls, false - no access
    Example: true

  - `data.dashboard.dashboard_calls_phones_access` (boolean)
    true - clients have access to view the phone number, false - no access
    Example: true

  - `data.dashboard.security_access` (boolean)
    true - there is access to security settings, false - no access

  - `data.dashboard.security_2fa_access` (boolean)
    true - there is access to 2FA security settings, false - no access

  - `data.dashboard.security_data_changes_access` (boolean)
    true - there is access to view data changes in security log, false - no access

  - `data.dashboard.security_employee_changes_access` (boolean)
    true - there is access to view employee changes in security log, false - no access

  - `data.dashboard.security_export_import_access` (boolean)
    true - there is access to export/import security logs, false - no access

  - `data.dashboard.security_logins_access` (boolean)
    true - there is access to view login history in security log, false - no access

  - `data.notification` (object)
    Notification settings
    Example: {"notification":true,"web_push":true,"web_phone_push":true,"notification_sms_ending_license":true,"notification_sms_low_balance":true,"notification_email_ending_license":true}

  - `data.notification.notification` (boolean)
    true - access to Notifications, false - no access
    Example: true

  - `data.notification.web_push` (boolean)
    true - there is access to show Push notifications about posts in the Web version, false - no access
    Example: true

  - `data.notification.web_phone_push` (boolean)
    true - there is access to show Push notifications about calls in the Web version, false - no access
    Example: true

  - `data.notification.notification_sms_ending_license` (boolean)
    true - there is access to send SMS notifications about imminent license expiration, false - no access
    Example: true

  - `data.notification.notification_sms_low_balance` (boolean)
    true - there is access to send SMS notifications about low balance, false - no access
    Example: true

  - `data.notification.notification_email_ending_license` (boolean)
    true - there is access to send Email notifications about imminent license expiration, false - no access
    Example: true

  - `data.loyalty` (object)
    Section Loyalty
    Example: {"loyalty_access":true,"has_loyalty_access":true,"loyalty_cards_manual_transactions_access":true,"has_loyalty_cards_manual_transactions_access":true,"loyalty_certificate_and_abonement_manual_transactions_access":true,"loyalty_abonement_balance_edit_access":true,"loyalty_abonement_history_access":true,"loyalty_abonement_period_edit_access":true,"loyalty_cards_issue_and_removal_access":true,"loyalty_certificate_balance_edit_access":true,"loyalty_certificate_period_edit_access":true}

  - `data.loyalty.loyalty_access` (boolean)
    true - there is access to loyalty, false - no access
    Example: true

  - `data.loyalty.has_loyalty_access` (boolean)
    true - there is access to loyalty, false - no access
    Example: true

  - `data.loyalty.loyalty_cards_manual_transactions_access` (boolean)
    true - there is access to manual replenishment/withdrawal from loyalty cards, false - no access
    Example: true

  - `data.loyalty.has_loyalty_cards_manual_transactions_access` (boolean)
    true - there is access to manual replenishment/withdrawal from loyalty cards, false - no access
    Example: true

  - `data.loyalty.loyalty_certificate_and_abonement_manual_transactions_access` (boolean)
    true - there is access to payment with a certificate and a membership without a code, false - no access
    Example: true

  - `data.loyalty.loyalty_abonement_balance_edit_access` (boolean)
    true - there is access to edit membership balance, false - no access
    Example: true

  - `data.loyalty.loyalty_abonement_history_access` (boolean)
    true - there is access to membership history, false - no access
    Example: true

  - `data.loyalty.loyalty_abonement_period_edit_access` (boolean)
    true - there is access to edit membership period, false - no access
    Example: true

  - `data.loyalty.loyalty_cards_issue_and_removal_access` (boolean)
    true - there is access to issue and remove loyalty cards, false - no access
    Example: true

  - `data.loyalty.loyalty_certificate_balance_edit_access` (boolean)
    true - there is access to edit gift card balance, false - no access
    Example: true

  - `data.loyalty.loyalty_certificate_period_edit_access` (boolean)
    true - there is access to edit gift card period, false - no access
    Example: true

  - `data.storages` (object)
    Section Inventory
    Example: {"storages_access":true,"storages_ids":[],"storages_transactions_access":true,"storages_last_days_count":-1,"storages_move_goods_access":true,"storages_create_transactions_access":true,"storages_create_last_days_count":-1,"storages_create_transactions_buy_access":true,"storages_create_transactions_sale_access":true,"storages_edit_transactions_access":true,"storages_edit_last_days_count":-1,"storages_edit_transactions_buy_access":true,"storages_edit_transactions_sale_access":true,"storages_delete_transactions_access":true,"storages_transactions_excel_access":true,"storages_transactions_types":[],"storages_inventory_access":true,"storages_inventory_create_edit_access":true,"storages_inventory_delete_access":true,"storages_inventory_excel_access":true,"storages_remnants_report_access":true,"storages_remnants_report_excel_access":true,"storages_sales_report_access":true,"storages_sales_report_excel_access":true,"storages_consumable_report_access":true,"storages_consumable_report_excel_access":true,"storages_write_off_report_access":true,"storages_write_off_report_excel_access":true,"storages_turnover_report_access":true,"storages_turnover_report_excel_access":true,"storages_goods_crud_access":true,"storages_goods_create_access":true,"storages_goods_update_access":true,"storages_goods_title_edit_access":true,"storages_goods_category_edit_access":true,"storages_goods_selling_price_edit_access":true,"storages_goods_cost_price_edit_access":true,"storages_goods_units_edit_access":true,"storages_goods_critical_balance_edit_access":true,"storages_goods_masses_edit_access":true,"storages_goods_comment_edit_access":true,"storages_goods_archive_access":true,"storages_goods_delete_access":true,"storages_limited_access":false,"storages_goods_prime_cost_view_access":true}

  - `data.storages.storages_access` (boolean)
    true - there is access to the inventory, false - no access
    Example: true

  - `data.storages.storages_ids` (array)
    true - there is access to the selected warehouses, false - no access
    Example: []

  - `data.storages.storages_transactions_access` (boolean)
    true - there is access to view product movements, false - no access
    Example: true

  - `data.storages.storages_last_days_count` (number)
    -1 - access to view product movements for all time, >= 0 - access to view product movements for the specified number of days in the past
    Example: -1

  - `data.storages.storages_move_goods_access` (boolean)
    true - there is access to moving products between warehouses, false - no access
    Example: true

  - `data.storages.storages_create_transactions_access` (boolean)
    true - there is access to create commodity transactions, false - no access
    Example: true

  - `data.storages.storages_create_last_days_count` (number)
    -1 - there is access to the creation of commodity transactions for the entire time, >= 0 - access to the creation of commodity transactions for the specified number of days in the past
    Example: -1

  - `data.storages.storages_create_transactions_buy_access` (boolean)
    true - there is access to registering the arrival of products, false - no access
    Example: true

  - `data.storages.storages_create_transactions_sale_access` (boolean)
    true - there is access to registration of sales of products, false - no access
    Example: true

  - `data.storages.storages_edit_transactions_access` (boolean)
    true - there is access to editing commodity transactions, false - no access
    Example: true

  - `data.storages.storages_edit_last_days_count` (number)
    -1 - there is access to editing commodity transactions for the whole time, >= 0 - access to editing commodity transactions for the specified number of days in the past
    Example: -1

  - `data.storages.storages_edit_transactions_buy_access` (boolean)
    true - there is access to registering the arrival of products, false - no access
    Example: true

  - `data.storages.storages_edit_transactions_sale_access` (boolean)
    true - there is access to registration of sales of products, false - no access
    Example: true

  - `data.storages.storages_delete_transactions_access` (boolean)
    true - there is access to deleting commodity transactions, false - no access
    Example: true

  - `data.storages.storages_transactions_excel_access` (boolean)
    true - there is access to unloading product movements in Excel, false - no access
    Example: true

  - `data.storages.storages_transactions_types` (array)
    true - there is access to unloading product movements in Excel, false - no access
    Example: []

  - `data.storages.storages_inventory_access` (boolean)
    true - there is access to the inventory, false - no access
    Example: true

  - `data.storages.storages_inventory_create_edit_access` (boolean)
    true - there is access to create and edit inventory, false - no access
    Example: true

  - `data.storages.storages_inventory_delete_access` (boolean)
    true - there is access to deleting inventory, false - no access
    Example: true

  - `data.storages.storages_inventory_excel_access` (boolean)
    true - there is access to unloading inventory in Excel, false - no access
    Example: true

  - `data.storages.storages_remnants_report_access` (boolean)
    true - there is access to the stock balance report, false - no access
    Example: true

  - `data.storages.storages_remnants_report_excel_access` (boolean)
    true - there is access to unloading balances in Excel, false - no access
    Example: true

  - `data.storages.storages_sales_report_access` (boolean)
    true - there is access to the sales report, false - no access
    Example: true

  - `data.storages.storages_sales_report_excel_access` (boolean)
    true - there is access to download sales report in Excel, false - no access
    Example: true

  - `data.storages.storages_consumable_report_access` (boolean)
    true - there is access to the consumable write-off report, false - no access
    Example: true

  - `data.storages.storages_consumable_report_excel_access` (boolean)
    true - there is access to downloading a report on writing off consumables in Excel, false - no access
    Example: true

  - `data.storages.storages_write_off_report_access` (boolean)
    true - there is access to the write-off report, false - no access
    Example: true

  - `data.storages.storages_write_off_report_excel_access` (boolean)
    true - there is access to unloading a report on the write-off of products in Excel, false - no access
    Example: true

  - `data.storages.storages_turnover_report_access` (boolean)
    true - there is access to the turnover report, false - no access
    Example: true

  - `data.storages.storages_turnover_report_excel_access` (boolean)
    true - there is access to download the turnover report in Excel, false - no access
    Example: true

  - `data.storages.storages_goods_crud_access` (boolean)
    true - there is access to product management, false - no access
    Example: true

  - `data.storages.storages_goods_create_access` (boolean)
    true - there is access to create products, false - no access
    Example: true

  - `data.storages.storages_goods_update_access` (boolean)
    true - there is access to change products, false - no access
    Example: true

  - `data.storages.storages_goods_title_edit_access` (boolean)
    true - there is access to the name, Article, Barcode, false - no access
    Example: true

  - `data.storages.storages_goods_category_edit_access` (boolean)
    true - there is access to categories, false - no access
    Example: true

  - `data.storages.storages_goods_selling_price_edit_access` (boolean)
    true - there is access to sell prices, false - no access
    Example: true

  - `data.storages.storages_goods_cost_price_edit_access` (boolean)
    true - there is access to the cost, false - no access
    Example: true

  - `data.storages.storages_goods_units_edit_access` (boolean)
    true - there is access to units of measurement, false - no access
    Example: true

  - `data.storages.storages_goods_critical_balance_edit_access` (boolean)
    true - there is access to critical balances, Desired balance, false - no access
    Example: true

  - `data.storages.storages_goods_masses_edit_access` (boolean)
    true - there is access to the mass, false - no access
    Example: true

  - `data.storages.storages_goods_comment_edit_access` (boolean)
    true - there is access to comments, false - no access
    Example: true

  - `data.storages.storages_goods_archive_access` (boolean)
    true - there is access to archiving and restoring products, false - no access
    Example: true

  - `data.storages.storages_goods_delete_access` (boolean)
    true - there is access to delete products, false - no access
    Example: true

  - `data.storages.storages_limited_access` (boolean)
    true - there is limited access to inventory, false - no access

  - `data.storages.storages_goods_prime_cost_view_access` (boolean)
    true - there is access to view product prime cost, false - no access
    Example: true

  - `data.settings` (object)
    Section Settings
    Example: {"settings_access":true,"settings_basis_access":true,"settings_information_access":true,"users_access":true,"delete_users_access":true,"create_users_access":true,"edit_users_access":true,"limited_users_access":false,"settings_services_access":true,"settings_services_create_access":true,"services_edit":true,"settings_services_edit_title_access":true,"settings_services_relation_category_access":true,"settings_services_edit_price_access":true,"settings_services_edit_image_access":true,"settings_services_edit_online_seance_date_time_access":true,"settings_services_edit_online_pay_access":true,"settings_services_edit_services_related_resource_access":true,"settings_positions_read":true,"settings_positions_create":true,"settings_positions_delete":true,"edit_master_service_and_duration":true,"tech_card_edit":true,"services_delete":true,"settings_master_access":true,"master_create":true,"master_edit":true,"master_delete":true,"settings_master_dismiss_access":true,"schedule_edit":true,"settings_notifications_access":true,"settings_email_notifications_access":true,"settings_template_notifications_access":true,"webhook_read_access":true,"settings_clients_labels_access":true,"settings_close_docs_access":true,"settings_user_notifications_access":true,"is_salon_tips_manager":false}

  - `data.settings.settings_access` (boolean)
    true - there is access to the settings section, false - no access
    Example: true

  - `data.settings.settings_basis_access` (boolean)
    true - there is access to the General section, false - no access
    Example: true

  - `data.settings.settings_information_access` (boolean)
    true - there is access to the Information section, false - no access
    Example: true

  - `data.settings.users_access` (boolean)
    true - there is access to user management, false - no access
    Example: true

  - `data.settings.delete_users_access` (boolean)
    true - there is access to delete users, false - no access
    Example: true

  - `data.settings.create_users_access` (boolean)
    true - there is access to adding users, false - no access
    Example: true

  - `data.settings.edit_users_access` (boolean)
    true - there is access to user rights management, false - no access
    Example: true

  - `data.settings.limited_users_access` (boolean)
    true - there is access to rights management within its own set of rights, false - no access

  - `data.settings.settings_services_access` (boolean)
    true - there is access to the Services section, false - no access
    Example: true

  - `data.settings.settings_services_create_access` (boolean)
    true - there is access to create services, false - no access
    Example: true

  - `data.settings.services_edit` (boolean)
    true - there is access to editing services, false - no access
    Example: true

  - `data.settings.settings_services_edit_title_access` (boolean)
    true - there is access to service names and a name for online booking, false - no access
    Example: true

  - `data.settings.settings_services_relation_category_access` (boolean)
    true - there is access to service categories, false - no access
    Example: true

  - `data.settings.settings_services_edit_price_access` (boolean)
    true - there is access to service prices, false - no access
    Example: true

  - `data.settings.settings_services_edit_image_access` (boolean)
    true - there is access to image uploads and changes, false - no access
    Example: true

  - `data.settings.settings_services_edit_online_seance_date_time_access` (boolean)
    true - there is access to displaying services in the widget, false - no access
    Example: true

  - `data.settings.settings_services_edit_online_pay_access` (boolean)
    true - there is access to online payment for the service, false - no access
    Example: true

  - `data.settings.settings_services_edit_services_related_resource_access` (boolean)
    true - there is access to the service resources, false - no access
    Example: true

  - `data.settings.settings_positions_read` (boolean)
    true - there is access to the position section, false - no access
    Example: true

  - `data.settings.settings_positions_create` (boolean)
    true - there is access to create posts, false - no access
    Example: true

  - `data.settings.settings_positions_delete` (boolean)
    true - there is access to delete posts, false - no access
    Example: true

  - `data.settings.edit_master_service_and_duration` (boolean)
    true - there is access to change team member services and their duration, false - no access
    Example: true

  - `data.settings.tech_card_edit` (boolean)
    true - there is access to change the technological map, false - no access
    Example: true

  - `data.settings.services_delete` (boolean)
    true - there is access to delete services, false - no access
    Example: true

  - `data.settings.settings_master_access` (boolean)
    true - there is access to the team members section, false - no access
    Example: true

  - `data.settings.master_create` (boolean)
    true - there is access to create team members, false - no access
    Example: true

  - `data.settings.master_edit` (boolean)
    true - there is access to edit team members, false - no access
    Example: true

  - `data.settings.master_delete` (boolean)
    true - there is access to delete team members, false - no access
    Example: true

  - `data.settings.settings_master_dismiss_access` (boolean)
    true - there is access to dismiss team members, false - no access
    Example: true

  - `data.settings.schedule_edit` (boolean)
    true - there is access to editing the work schedule, false - no access
    Example: true

  - `data.settings.settings_notifications_access` (boolean)
    true - there is access to the Sms notification section, false - no access
    Example: true

  - `data.settings.settings_email_notifications_access` (boolean)
    true - there is access to the Email notification section, false - no access
    Example: true

  - `data.settings.settings_template_notifications_access` (boolean)
    true - there is access to the Notification types section, false - no access
    Example: true

  - `data.settings.webhook_read_access` (boolean)
    true - there is access to change WebHook settings, false - no access
    Example: true

  - `data.settings.settings_clients_labels_access` (boolean)
    true - there is access to client tags/labels settings, false - no access
    Example: true

  - `data.settings.settings_close_docs_access` (boolean)
    true - there is access to close documents, false - no access
    Example: true

  - `data.settings.settings_user_notifications_access` (boolean)
    true - there is access to user notifications settings, false - no access
    Example: true

  - `data.settings.is_salon_tips_manager` (boolean)
    true - user is a tips manager, false - not a tips manager

  - `data.security` (object)
    Section Security

  - `data.security.security_access` (boolean)
    true - there is access to security settings, false - no access

  - `data.security.security_2fa_access` (boolean)
    true - there is access to 2FA security settings, false - no access

  - `data.security.security_data_changes_access` (boolean)
    true - there is access to view data changes in security log, false - no access

  - `data.security.security_employee_changes_access` (boolean)
    true - there is access to view employee changes in security log, false - no access

  - `data.security.security_export_import_access` (boolean)
    true - there is access to export/import security logs, false - no access

  - `data.security.security_logins_access` (boolean)
    true - there is access to view login history in security log, false - no access

  - `data.comers` (object)
    Section Visitors
    Example: {"comers_access":false,"comers_info_vehicle_view_access":false,"comers_info_vehicle_edit_access":false}

  - `data.comers.comers_access` (boolean)
    true - there is access to visitors section, false - no access

  - `data.comers.comers_info_vehicle_view_access` (boolean)
    true - there is access to view vehicle information for visitors, false - no access

  - `data.comers.comers_info_vehicle_edit_access` (boolean)
    true - there is access to edit vehicle information for visitors, false - no access

  - `data.other` (object)
    Access to analytics, billing, SMS mailings and enabling access to a location by IP address
    Example: {"stat_access":true,"billing_access":true,"send_sms":true,"salon_to_salon_group_add_access":true,"analytics_constructor_access":true,"billing_invoices_access":true,"auth_enable_check_ip":false,"auth_list_allowed_ip":[]}

  - `data.other.stat_access` (boolean)
    true - there is access to analytics, false - no access
    Example: true

  - `data.other.analytics_constructor_access` (boolean)
    true - there is access to analytics constructor, false - no access
    Example: true

  - `data.other.billing_access` (boolean)
    true - there is access to billing (balance menu section), false - no access
    Example: true

  - `data.other.billing_invoices_access` (boolean)
    true - there is access to billing invoices, false - no access
    Example: true

  - `data.other.send_sms` (boolean)
    true - there is access to SMS distribution to clients, false - no access
    Example: true

  - `data.other.auth_enable_check_ip` (boolean)
    true - there is access to the location only from IP addresses (v4, v6), false - no access

  - `data.other.auth_list_allowed_ip` (array)
    list of IP addresses
    Example: []

  - `data.other.salon_to_salon_group_add_access` (boolean)
    true - there is access to add locations to location groups, false - no access
    Example: true

  - `data.other.is_salon_tips_manager` (boolean)
    true - user is a tips manager, false - not a tips manager

  - `data.online_record` (object)
    Section Online Booking
    Example: {"online_record_access":true,"online_record_privacy_policy_access":true}

  - `data.online_record.online_record_access` (boolean)
    true - there is access to online booking, false - no access
    Example: true

  - `data.online_record.online_record_privacy_policy_access` (boolean)
    true - there is access to privacy policy settings for online booking, false - no access
    Example: true

  - `data.security_access` (boolean)
    true - there is access to security settings, false - no access

  - `data.security_2fa_access` (boolean)
    true - there is access to 2FA security settings, false - no access

  - `data.security_data_changes_access` (boolean)
    true - there is access to view data changes in security log, false - no access

  - `data.security_employee_changes_access` (boolean)
    true - there is access to view employee changes in security log, false - no access

  - `data.security_export_import_access` (boolean)
    true - there is access to export/import security logs, false - no access

  - `data.security_logins_access` (boolean)
    true - there is access to view login history in security log, false - no access

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



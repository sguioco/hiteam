# Payment at the Location Account and Loyalty (Various Methods)

As a response, information about the Sale operation is returned

Endpoint: POST /company/{location_id}/sale/{document_id}/payment
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Path parameters:

  - `document_id` (number, required)
    Document ID

  - `location_id` (number, required)
    Location ID

## Request fields (application/json):

  - `body` (Payment at the checkout (object) or Payment via client personal account (object) or Payment with a gift card (object) or Payment with membership - works only for the visit (object) or Pay with referral program - works only for visit (object) or Pay with a loyalty card (object) or Pay with a loyalty program (object), required) — one of:
    - Payment at the checkout:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"account","account_id":90218},"amount":123}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"account","account_id":90218}
      - `payment.method.slug` (string)
        Payment method type
        Example: "account"
      - `payment.method.account_id` (integer)
        Checkout ID
        Example: 90218
      - `payment.amount` (number)
        Payment amount
        Example: 123
    - Payment via client personal account:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"deposit","deposit_id":220},"amount":123}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"deposit","deposit_id":220}
      - `payment.method.slug` (string)
        Payment method type
        Example: "deposit"
      - `payment.method.deposit_id` (integer)
        Client's personal account ID
        Example: 220
      - `payment.amount` (number)
        Payment amount
        Example: 123
    - Payment with a gift card:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"loyalty_certificate","loyalty_certificate_id":325},"amount":123,"number":123123}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"loyalty_certificate","loyalty_certificate_id":325}
      - `payment.method.slug` (string)
        Payment method type
        Example: "loyalty_certificate"
      - `payment.method.loyalty_certificate_id` (integer)
        Certificate ID
        Example: 325
      - `payment.amount` (number)
        Payment amount
        Example: 123
      - `payment.number` (string)
        Certificate code
        Example: 123123
    - Payment with membership - works only for the visit:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"loyalty_abonement","loyalty_abonement_id":275},"number":123123}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"loyalty_abonement","loyalty_abonement_id":275}
      - `payment.method.slug` (string)
        Payment method type
        Example: "loyalty_abonement"
      - `payment.method.loyalty_abonement_id` (integer)
        Membership ID
        Example: 275
      - `payment.number` (string)
        Subscription code
        Example: 123123
    - Pay with referral program - works only for visit:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"referral_loyalty_program","loyalty_program_id":717},"referrer_phone":"+13155550175"}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"referral_loyalty_program","loyalty_program_id":717}
      - `payment.method.slug` (string)
        Payment method type
        Example: "referral_loyalty_program"
      - `payment.method.loyalty_program_id` (integer)
        Loyalty program ID
        Example: 717
      - `payment.referrer_phone` (string)
        Phone of the inviter
        Example: "+13155550175"
    - Pay with a loyalty card:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"loyalty_card","loyalty_card_id":185395},"amount":123}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"loyalty_card","loyalty_card_id":185395}
      - `payment.method.slug` (string)
        Payment method type
        Example: "loyalty_card"
      - `payment.method.loyalty_card_id` (integer)
        Loyalty card ID
        Example: 185395
      - `payment.amount` (number)
        Payment amount
        Example: 123
    - Pay with a loyalty program:
      - `payment` (object)
        Object containing the payment method
        Example: {"method":{"slug":"loyalty_program","loyalty_program_id":339,"loyalty_card_id":185395}}
      - `payment.method` (object)
        Payment method
        Example: {"slug":"loyalty_program","loyalty_program_id":339,"loyalty_card_id":185395}
      - `payment.method.slug` (string)
        Payment method type
        Example: "loyalty_program"
      - `payment.method.loyalty_program_id` (integer)
        Loyalty program ID
        Example: 339
      - `payment.method.loyalty_card_id` (integer)
        Loyalty card ID
        Example: 185395

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"state":{"items":[{"id":2181520,"type":"good","title":"item 12","amount":1,"default_cost_per_unit":1300,"default_cost_total":1300,"client_discount_percent":10,"cost_to_pay_total":1170},{"id":22017,"type":"service","document_id":8200391,"title":"Manicure","amount":1,"default_cost_per_unit":500,"default_cost_total":500,"client_discount_percent":10,"cost_to_pay_total":450}],"loyalty_transactions":[{"id":25042,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":9.9,"type_id":11,"created_at":"2026-09-21T23:00:00.000-05:00","deposit_transaction_id":775,"chain":{"id":500,"title":"YC BE chain"},"type":{"id":11,"title":"Withdrawal from personal account"},"deposit":{"id":220,"balance":990.1,"reserved_balance":0,"type":{"id":5,"title":"deposit 1"}}},{"id":25043,"document_id":8201102,"amount":0.1,"type_id":2,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_card_id":185395,"loyalty_program_id":264,"chain":{"id":231,"title":"Example chain."},"type":{"id":2,"title":"Loyalty programs"},"loyalty_card":{"id":185395,"type_id":265,"number":23100185395,"balance":50.15,"type":{"id":265,"type":"Loyalty program template test"},"chain":{"id":231,"title":"Example chain."}},"loyalty_program":{"id":264,"title":"CASHBACK BigBro","type_id":7,"is_value_percent":true,"type":{"id":7,"title":"Cumulative cashback (paid)"},"chain":{"id":231,"title":"Example chain."}}},{"id":25050,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":100,"type_id":8,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_certificate_id":339,"chain":{"id":79,"title":"Bank 24"},"type":{"id":8,"title":"Write-off from the certificate"},"loyalty_certificate":{"id":339,"balance":0,"applicable_balance":0,"type":{"id":20,"title":"Test Certificate","is_code_required":true},"chain":{"id":231,"title":"Example chain."}}}],"payment_transactions":[{"id":6033940,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":32,"account":{"id":90218,"title":"Cash by default","is_cash":true,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6033941,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":27,"account":{"id":90218,"title":"location account","is_cash":true,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034121,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":43,"account":{"id":23182,"title":"Cards - acquiring by default","is_cash":false,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034122,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":12,"account":{"id":23182,"title":"Cards - acquiring","is_cash":false,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}}]},"kkm_state":{"last_operation_type":1,"transactions":[{"id":2424,"document_id":8200904,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":0,"sum":0,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":7215,"type":1,"type_title":"Sale of goods"},"cashier":{"id":746310,"name":"Jack Smith"}}]},"payment_methods":[{"slug":"account","is_applicable":false,"applicable_amount":1170,"applicable_count":0,"applicable_value":0,"account_id":36785,"account":{"id":36785,"title":"Location account - non-cash","is_cash":false}},{"slug":"loyalty_card","is_applicable":true,"applicable_amount":51.65,"applicable_count":0,"applicable_value":0,"loyalty_card_id":19283,"loyalty_card":{"id":19283,"type_id":155,"number":31200019283,"balance":51.65,"type":{"id":155,"type":"discount card"},"chain":{"id":312,"title":"Trinity group"}}},{"slug":"loyalty_program","is_applicable":true,"applicable_amount":234,"applicable_count":0,"applicable_value":20,"loyalty_card_id":19283,"loyalty_program_id":183,"loyalty_card":{"id":19283,"type_id":155,"number":31200019283,"balance":51.65,"type":{"id":155,"type":"discount card"},"chain":{"id":312,"title":"Trinity group"}},"loyalty_program":{"id":183,"title":"permanent discount","type_id":1,"is_value_percent":true,"type":{"id":1,"title":"Fixed discount"},"chain":{"id":312,"title":"Trinity group"}}},{"slug":"loyalty_abonement","is_applicable":false,"applicable_amount":0,"applicable_count":0,"applicable_value":0,"loyalty_abonement_id":27,"loyalty_abonement":{"id":27,"is_united_balance":false,"united_balance":0,"type":{"id":7,"title":"subscription to 5000 QA net","is_code_required":true},"chain":{"id":231,"title":"Example chain."},"balance_container":{"links":[{"count":5,"category":{"id":229680,"category_id":1,"title":"Manicure"}},{"count":5,"category":{"id":429813,"category_id":429812,"title":"1 Lesson"}}]}}},{"slug":"loyalty_certificate","is_applicable":true,"applicable_amount":1170,"applicable_count":0,"applicable_value":0,"loyalty_certificate_id":338,"loyalty_certificate":{"id":338,"balance":10000,"applicable_balance":10000,"type":{"id":130,"title":"test","is_code_required":true},"chain":{"id":231,"title":"Example chain."}}},{"slug":"referral_loyalty_program","is_applicable":false,"applicable_amount":0,"applicable_count":0,"applicable_value":0,"loyalty_program_id":424,"loyalty_program":{"id":424,"title":"Fixed discount","type_id":1,"is_value_percent":true,"type":{"id":1,"title":"Fixed discount"},"chain":{"id":231,"title":"Example chain."}}},{"slug":"deposit","is_applicable":true,"applicable_amount":9.9,"applicable_count":0,"applicable_value":0,"deposit_id":220,"deposit":{"id":220,"balance":1000,"reserved_balance":0,"type":{"id":5,"title":"deposit 1"}}}]}

  - `data.state` (object)
    Example: {"items":[{"id":2181520,"type":"good","title":"item 12","amount":1,"default_cost_per_unit":1300,"default_cost_total":1300,"client_discount_percent":10,"cost_to_pay_total":1170},{"id":22017,"type":"service","document_id":8200391,"title":"Manicure","amount":1,"default_cost_per_unit":500,"default_cost_total":500,"client_discount_percent":10,"cost_to_pay_total":450}],"loyalty_transactions":[{"id":25042,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":9.9,"type_id":11,"created_at":"2026-09-21T23:00:00.000-05:00","deposit_transaction_id":775,"chain":{"id":500,"title":"YC BE chain"},"type":{"id":11,"title":"Withdrawal from personal account"},"deposit":{"id":220,"balance":990.1,"reserved_balance":0,"type":{"id":5,"title":"deposit 1"}}},{"id":25043,"document_id":8201102,"amount":0.1,"type_id":2,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_card_id":185395,"loyalty_program_id":264,"chain":{"id":231,"title":"Example chain."},"type":{"id":2,"title":"Loyalty programs"},"loyalty_card":{"id":185395,"type_id":265,"number":23100185395,"balance":50.15,"type":{"id":265,"type":"Loyalty program template test"},"chain":{"id":231,"title":"Example chain."}},"loyalty_program":{"id":264,"title":"CASHBACK BigBro","type_id":7,"is_value_percent":true,"type":{"id":7,"title":"Cumulative cashback (paid)"},"chain":{"id":231,"title":"Example chain."}}},{"id":25050,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":100,"type_id":8,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_certificate_id":339,"chain":{"id":79,"title":"Bank 24"},"type":{"id":8,"title":"Write-off from the certificate"},"loyalty_certificate":{"id":339,"balance":0,"applicable_balance":0,"type":{"id":20,"title":"Test Certificate","is_code_required":true},"chain":{"id":231,"title":"Example chain."}}}],"payment_transactions":[{"id":6033940,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":32,"account":{"id":90218,"title":"Cash by default","is_cash":true,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6033941,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":27,"account":{"id":90218,"title":"location account","is_cash":true,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034121,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":43,"account":{"id":23182,"title":"Cards - acquiring by default","is_cash":false,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034122,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":12,"account":{"id":23182,"title":"Cards - acquiring","is_cash":false,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}}]}

  - `data.state.items` (array)
    Example: [{"id":2181520,"type":"good","title":"item 12","amount":1,"default_cost_per_unit":1300,"default_cost_total":1300,"client_discount_percent":10,"cost_to_pay_total":1170},{"id":22017,"type":"service","document_id":8200391,"title":"Manicure","amount":1,"default_cost_per_unit":500,"default_cost_total":500,"client_discount_percent":10,"cost_to_pay_total":450}]

  - `data.state.items.id` (number)
    Selling unit ID

  - `data.state.items.type` (string)
    Type (service/product)

  - `data.state.items.title` (string)
    Name

  - `data.state.items.amount` (number)
    Quantity

  - `data.state.items.default_cost_per_unit` (number)
    Unit price

  - `data.state.items.default_cost_total` (number)
    Total default price

  - `data.state.items.client_discount_percent` (number)
    Discount percentage

  - `data.state.items.cost_to_pay_total` (number)
    Payable price

  - `data.state.loyalty_transactions` (array)
    Loyalty Payment Transaction
    Example: [{"id":25042,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":9.9,"type_id":11,"created_at":"2026-09-21T23:00:00.000-05:00","deposit_transaction_id":775,"chain":{"id":500,"title":"YC BE chain"},"type":{"id":11,"title":"Withdrawal from personal account"},"deposit":{"id":220,"balance":990.1,"reserved_balance":0,"type":{"id":5,"title":"deposit 1"}}},{"id":25043,"document_id":8201102,"amount":0.1,"type_id":2,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_card_id":185395,"loyalty_program_id":264,"chain":{"id":231,"title":"Example chain."},"type":{"id":2,"title":"Loyalty programs"},"loyalty_card":{"id":185395,"type_id":265,"number":23100185395,"balance":50.15,"type":{"id":265,"type":"Loyalty program template test"},"chain":{"id":231,"title":"Example chain."}},"loyalty_program":{"id":264,"title":"CASHBACK BigBro","type_id":7,"is_value_percent":true,"type":{"id":7,"title":"Cumulative cashback (paid)"},"chain":{"id":231,"title":"Example chain."}}},{"id":25050,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","amount":100,"type_id":8,"created_at":"2026-09-21T23:00:00.000-05:00","loyalty_certificate_id":339,"chain":{"id":79,"title":"Bank 24"},"type":{"id":8,"title":"Write-off from the certificate"},"loyalty_certificate":{"id":339,"balance":0,"applicable_balance":0,"type":{"id":20,"title":"Test Certificate","is_code_required":true},"chain":{"id":231,"title":"Example chain."}}}]

  - `data.state.loyalty_transactions.id` (integer)
    Loyalty transaction ID

  - `data.state.loyalty_transactions.document_id` (integer)
    Document ID

  - `data.state.loyalty_transactions.sale_item_id` (integer)
    Sold unit ID

  - `data.state.loyalty_transactions.sale_item_type` (string)
    Unit sold type

  - `data.state.loyalty_transactions.amount` (number)
    Transaction amount

  - `data.state.loyalty_transactions.type_id` (integer)
    Transaction type identifier

  - `data.state.loyalty_transactions.created_at` (string)
    date of creation

  - `data.state.loyalty_transactions.deposit_transaction_id` (integer)
    Transaction ID (depends on type)

  - `data.state.loyalty_transactions.chain` (object)
    Location chain

  - `data.state.loyalty_transactions.chain.id` (integer)
    Location chain ID

  - `data.state.loyalty_transactions.chain.title` (string)
    Location chain name

  - `data.state.loyalty_transactions.type` (object)
    Transaction type

  - `data.state.loyalty_transactions.type.id` (integer)
    Transaction type ID

  - `data.state.loyalty_transactions.type.title` (string)
    Transaction type name

  - `data.state.loyalty_transactions.deposit` (object)
    Withdrawal from personal account

  - `data.state.loyalty_transactions.deposit.id` (integer)
    Personal account ID

  - `data.state.loyalty_transactions.deposit.balance` (number)
    Available personal account balance

  - `data.state.loyalty_transactions.deposit.reserved_balance` (number)
    Amount currently reserved by active holds

  - `data.state.loyalty_transactions.deposit.type` (object)
    Client account type

  - `data.state.loyalty_transactions.deposit.type.id` (integer)
    Client account type identifier

  - `data.state.loyalty_transactions.deposit.type.title` (string)
    Name of the client account

  - `data.state.payment_transactions` (array)
    Cashier payment transaction
    Example: [{"id":6033940,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":32,"account":{"id":90218,"title":"Cash by default","is_cash":true,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6033941,"document_id":8200904,"sale_item_id":2181442,"sale_item_type":"good","expense_id":7,"account_id":90218,"amount":27,"account":{"id":90218,"title":"location account","is_cash":true,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034121,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":43,"account":{"id":23182,"title":"Cards - acquiring by default","is_cash":false,"is_default":true},"expense":{"id":7,"title":"Sale of goods"}},{"id":6034122,"document_id":8201102,"sale_item_id":2181521,"sale_item_type":"good","expense_id":7,"account_id":23182,"amount":12,"account":{"id":23182,"title":"Cards - acquiring","is_cash":false,"is_default":false},"expense":{"id":7,"title":"Sale of goods"}}]

  - `data.state.payment_transactions.id` (integer)
    Payment transaction ID

  - `data.state.payment_transactions.document_id` (integer)
    Document ID

  - `data.state.payment_transactions.sale_item_id` (integer)
    Sold unit ID

  - `data.state.payment_transactions.sale_item_type` (string)
    Unit sold type

  - `data.state.payment_transactions.expense_id` (integer)
    Payment Item ID

  - `data.state.payment_transactions.account_id` (integer)
    Checkout ID

  - `data.state.payment_transactions.created_at` (string)
    date of creation

  - `data.state.payment_transactions.account` (object)
    Location account

  - `data.state.payment_transactions.account.id` (integer)
    Checkout ID

  - `data.state.payment_transactions.account.title` (string)
    Location account name

  - `data.state.payment_transactions.account.is_cash` (boolean)
    Is the payment in cash

  - `data.state.payment_transactions.account.is_default` (boolean)
    Is the checkout by default

  - `data.state.payment_transactions.expense` (object)
    Payment Article

  - `data.state.payment_transactions.expense.id` (integer)
    Payment Item ID

  - `data.state.payment_transactions.expense.title` (string)
    Name of payment item

  - `data.kkm_state` (object)
    Example: {"last_operation_type":1,"transactions":[{"id":2424,"document_id":8200904,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":0,"sum":0,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":7215,"type":1,"type_title":"Sale of goods"},"cashier":{"id":746310,"name":"Jack Smith"}}]}

  - `data.kkm_state.last_operation_type` (integer)
    Type of last KKM operation
    Example: 1

  - `data.kkm_state.transactions` (array)
    KKM transaction
    Example: [{"id":2424,"document_id":8200904,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":0,"sum":0,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":7215,"type":1,"type_title":"Sale of goods"},"cashier":{"id":746310,"name":"Jack Smith"}}]

  - `data.kkm_state.transactions.id` (integer)
    KKM transaction ID

  - `data.kkm_state.transactions.document_id` (integer)
    Document ID

  - `data.kkm_state.transactions.print_date` (string)
    Check printing date

  - `data.kkm_state.transactions.printed_count` (integer)

  - `data.kkm_state.transactions.sum` (integer)

  - `data.kkm_state.transactions.type` (object)

  - `data.kkm_state.transactions.type.id` (integer)

  - `data.kkm_state.transactions.type.title` (string)

  - `data.kkm_state.transactions.status` (object)
    Receipt printing status

  - `data.kkm_state.transactions.status.id` (integer)
    Status ID

  - `data.kkm_state.transactions.status.title` (string)
    Status name

  - `data.kkm_state.transactions.document` (object)

  - `data.kkm_state.transactions.document.id` (integer)
    Document ID

  - `data.kkm_state.transactions.document.type` (integer)
    Document Type

  - `data.kkm_state.transactions.document.type_title` (string)
    Document type name

  - `data.kkm_state.transactions.cashier` (object)
    Cashier

  - `data.kkm_state.transactions.cashier.id` (integer)
    team member ID

  - `data.kkm_state.transactions.cashier.name` (string)
    team member name

  - `data.payment_methods` (array)
    Example: [{"slug":"account","is_applicable":false,"applicable_amount":1170,"applicable_count":0,"applicable_value":0,"account_id":36785,"account":{"id":36785,"title":"Location account - non-cash","is_cash":false}},{"slug":"loyalty_card","is_applicable":true,"applicable_amount":51.65,"applicable_count":0,"applicable_value":0,"loyalty_card_id":19283,"loyalty_card":{"id":19283,"type_id":155,"number":31200019283,"balance":51.65,"type":{"id":155,"type":"discount card"},"chain":{"id":312,"title":"Trinity group"}}},{"slug":"loyalty_program","is_applicable":true,"applicable_amount":234,"applicable_count":0,"applicable_value":20,"loyalty_card_id":19283,"loyalty_program_id":183,"loyalty_card":{"id":19283,"type_id":155,"number":31200019283,"balance":51.65,"type":{"id":155,"type":"discount card"},"chain":{"id":312,"title":"Trinity group"}},"loyalty_program":{"id":183,"title":"permanent discount","type_id":1,"is_value_percent":true,"type":{"id":1,"title":"Fixed discount"},"chain":{"id":312,"title":"Trinity group"}}},{"slug":"loyalty_abonement","is_applicable":false,"applicable_amount":0,"applicable_count":0,"applicable_value":0,"loyalty_abonement_id":27,"loyalty_abonement":{"id":27,"is_united_balance":false,"united_balance":0,"type":{"id":7,"title":"subscription to 5000 QA net","is_code_required":true},"chain":{"id":231,"title":"Example chain."},"balance_container":{"links":[{"count":5,"category":{"id":229680,"category_id":1,"title":"Manicure"}},{"count":5,"category":{"id":429813,"category_id":429812,"title":"1 Lesson"}}]}}},{"slug":"loyalty_certificate","is_applicable":true,"applicable_amount":1170,"applicable_count":0,"applicable_value":0,"loyalty_certificate_id":338,"loyalty_certificate":{"id":338,"balance":10000,"applicable_balance":10000,"type":{"id":130,"title":"test","is_code_required":true},"chain":{"id":231,"title":"Example chain."}}},{"slug":"referral_loyalty_program","is_applicable":false,"applicable_amount":0,"applicable_count":0,"applicable_value":0,"loyalty_program_id":424,"loyalty_program":{"id":424,"title":"Fixed discount","type_id":1,"is_value_percent":true,"type":{"id":1,"title":"Fixed discount"},"chain":{"id":231,"title":"Example chain."}}},{"slug":"deposit","is_applicable":true,"applicable_amount":9.9,"applicable_count":0,"applicable_value":0,"deposit_id":220,"deposit":{"id":220,"balance":1000,"reserved_balance":0,"type":{"id":5,"title":"deposit 1"}}}]

  - `data.payment_methods.slug` (string)
    Payment method type

  - `data.payment_methods.is_applicable` (boolean)
    Is it possible to use this method

  - `data.payment_methods.applicable_amount` (number)
    Possible amount accepted for payment

  - `data.payment_methods.applicable_count` (integer)
    Possible number of visits (in case of membership)

  - `data.payment_methods.applicable_value` (number)
    Applicable bonus (in the case of a loyalty program)

  - `data.payment_methods.account_id` (integer)
    Checkout ID (depends on slug)

  - `data.payment_methods.account` (object)
    Location account

  - `data.payment_methods.account.id` (integer)
    Checkout ID

  - `data.payment_methods.account.title` (string)
    Location account name

  - `data.payment_methods.account.is_cash` (boolean)
    Is the location account cash

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



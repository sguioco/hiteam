div
div
div
div
div
div
span
⚡
DEVELOPERS & PARTNERS HUB
          
h1
Build 
span
Powerful
Integrations
          
p
Official API documentation for integrating online booking, CRM, scheduling, POS, and business management features into your applications
          
div
div
div
200+
div
API endpoints
div
div
99.98%
div
Platform uptime
div
a
Browse APIs
a
Get API Key
div
div
div
span
span
span
code
span
# Get available time slots
span
span
curl
-X GET 
span
"https://api.alteg.io/api/v1/book_times/{company_id}/{staff_id}/{date}"
\
  -H 
span
"Authorization: Bearer {partner_token}"
\
  -H 
span
"Accept: application/vnd.api.v2+json"
div
div
h2
Available 
span
APIs
p
Four specialized APIs for different integration scenarios
      
div
a
h3
Online Booking
p
Public endpoints for booking widgets and client portals. No user authentication required
div
Explore
a
h3
Business Management
span
v2
p
Complete business operations API with improved design. New features are released here first. Recommended for new integrations
div
Explore
a
h3
Business Management
span
v1
p
Full-featured API for all business operations: scheduling, POS, CRM, inventory, finances, loyalty. Maintained for backward compatibility
div
Explore
a
h3
Developer Tools
p
Webhooks, dictionaries, and integration tools for marketplace app developers
div
Explore
div
div
div
div
h2
Getting Started
p
The Altegio API allows third-party developers to perform most operations with platform data. When designing methods, we adhered to the REST architecture.
          
ul
li
All requests are encrypted with TLS 1.2+
li
Rate limit: 200 requests/min or 5 requests/sec per IP
li
Base URL: 
code
https://api.alteg.io/api
h2
API Versioning
p
The API uses URL path versioning. Both V1 and V2 are production-ready. New features may be released in V2 only. V1 endpoints are maintained for backward compatibility.
          
ul
li
strong
V1
(
code
/v1/...
) — Stable, full-featured API
li
strong
V2
(
code
/v2/...
) — New endpoints with improved design
div
div
h4
Authentication
p
API requests are authorized per 
a
RFC 6749
. Two authorization modes:
            
p
strong
Partner only
(public endpoints):
code
Authorization: Bearer 
<
partner_token
>
p
strong
Partner + User
(business data):
code
Authorization: Bearer 
<
partner_token
>
, User 
<
user_token
>
p
Get partner token at 
a
Marketplace
. Get user token via 
a
auth endpoint
or app settings.
            
div
h4
Date & Time Format
code
"2026-09-21T23:00:00.000-05:00"
p
ISO 8601 format. Durations are in seconds (e.g., 900 = 15 min)
            
div
div
div
div
h2
Developer Support
p
Our API team is here to help you build successful integrations. Whether you're troubleshooting an issue or planning a complex implementation, we provide technical guidance to keep your project moving forward.
div
div
span
Direct API Support
span
Get answers from engineers who built the API
div
span
Integration Review
span
Architecture feedback before you ship
div
span
Priority Response
span
Business-critical issues handled first
div
div
span
Contact API Team
a
api@alteg.io
p
Include request URL, headers, body, and response for faster resolution
div
div
div
div
span
Partner Program
h3
Earn with Altegio
p
Connect clients to the platform and receive recurring commissions. Dedicated support, marketing materials, and API access included.
a
Learn more
div
span
Up to
span
50%
span
commission
div
div
h2
What You Can 
span
Build
p
Popular integration scenarios powered by Altegio API
      
div
div
div
🗓️
h4
Booking Widget
p
Embed scheduling into websites, mobile apps, or kiosks
div
div
🤖
h4
AI Assistants
p
Let GPT, Claude or custom bots book appointments via API
div
div
📊
h4
Analytics Dashboard
p
Build custom reports, BI integrations, data warehouses
div
div
🔄
h4
CRM Sync
p
Two-way sync with Salesforce, HubSpot, custom CRMs
div
div
📱
h4
White-label Apps
p
Build branded booking apps for your clients
div
div
💳
h4
POS Integration
p
Connect payments, receipts, fiscal printers
div
div
📦
h4
Inventory Automation
p
Sync stock levels with suppliers, e-commerce
div
div
🔔
h4
Custom Notifications
p
Webhooks for real-time events, custom messaging
div
div
h2
Core 
span
Entities
p
The API allows you to work with most of the platform's entities. Note that there are inconsistencies in the technical terminology: method and variable names may differ between the user interface and the documentation
      
div
div
h3
Locations
p
A Location is an individual business unit that operates within the platform. Each Location belongs to a Chain. For single-location businesses, the platform still creates a single-location Chain.
a
Learn more →
small
Also known as: company, branch, filial, salon
div
h3
Chains
p
A Chain is a group of multiple Locations managed as a single business network. Chain-level settings, promotions, service catalogs, and loyalty rules may be inherited by all child Locations while each Location can still override them where needed.
a
Learn more →
small
Also known as: groups, networks, salon_groups
div
h3
Users
p
A User is an account that provides authenticated access to one or more Locations. Access scope is defined by Roles, which are predefined sets of Access Rights. If a User does not have access to a module or method, the API returns HTTP 403. Users can also be linked to Chains for Chain-level requests. Most API methods require the User to be authorised and to have explicit access to the target Location.
a
Learn more →
small
Also known as: account, login
div
h3
Team Members and Positions
p
A Team Member is an individual within a Location who participates in operational processes: provides Services within Appointments, creates or manages reservations, or works with financial and analytical data. Positions are logical groups of Team Members (similar to folders) that help structure staff by departments, functions, or specialisation.
a
Learn more →
small
Also known as: employee, staff, staff_member, master
div
h3
Resources
p
Resources are limited items required to provide Services (rooms, chairs, devices, machines). A Resource cannot be used in parallel for multiple Appointments; it is reserved when a Service linked to that Resource is booked.
a
Learn more →
small
Also known as: equipment, room
div
h3
Schedule & Time Slots
p
A Schedule is a set of time intervals during which a Team Member or Resource is available to provide Services. A Time Slot is a specific available interval within the Schedule that can be booked online for an Appointment with a Team Member.
a
Learn more →
small
Also known as: timetable, availability
div
h3
Appointments & Visits
p
An Appointment is a scheduled time interval during which a specific Team Member provides one or more Services or sells Products to a specific Client. A Visit is a group of one or more Appointments that take place during a single Client presence at a Location. Grouping rules depend on the Location settings.
a
Learn more →
small
Also known as: record, booking
div
h3
Events
p
An Event is a scheduled time slot for a group Service where multiple Clients can book simultaneously. Unlike individual Appointments, an Event has a capacity limit defining the maximum number of participants. Events are used for group classes, workshops, webinars, and any service that can serve multiple Clients at the same time.
a
Learn more →
small
Also known as: activity, group event
div
h3
Clients
p
A Client is an individual who books, receives, or has received Services or Products from a Location. Client data is used for scheduling, communication, and analytics.
a
Learn more →
small
Also known as: customer, visitor
div
h3
Services and Service Categories
p
A Service is a predefined type of work or procedure that can be provided to a Client by a Team Member within a Location. Each Service has key parameters such as duration, price (or price range), and applicable resources. Service Categories are logical groups used to organise Services for configuration, reporting, and client-facing catalogs.
a
Learn more →
small
Also known as: treatments, procedures
div
h3
Products and Product Categories
p
A Product is a tangible or consumable item that can be sold to a Client or used as part of a Service. Product Categories are logical groups used to organise Products for inventory management, reporting, and sales operations.
a
Learn more →
small
Also known as: goods, items
div
h3
Inventories
p
Inventories represent physical or logical Warehouses used to store and track Products and consumables. Inventory operations (receipts, write-offs, transfers) ensure that product usage in Visits is reflected in stock levels and financial reports.
a
Learn more →
small
Also known as: storages, warehouses
div
h3
Suppliers
p
Suppliers and Partners are counterparties used in Inventory and Finance modules to track product purchases, settlements, and mutual transactions with external companies.
a
Learn more →
small
Also known as: partners, vendors
div
h3
Location Accounts
p
Location Accounts are accounts (cash registers or bank accounts) attached to a specific Location. They are used to record payments for Visits, product sales, and other financial operations, and they define how money flows are grouped in financial reports.
a
Learn more →
small
Also known as: cashdesks, cash registers
div
h3
Payment Methods
p
Payment methods define how payments are recorded in the system (cash, card, bank transfer, online acquiring, loyalty instruments). Each method is linked to specific Accounts and can have its own commission and reporting logic.
a
Learn more →
small
Also known as: payment types
div
h3
Payroll Rules
p
Payroll rules define how staff compensation is calculated based on Visits, Products, Memberships, tips, and other metrics. They describe commission schemes, fixed payments, and deductions.
a
Learn more →
small
Also known as: salary, wages
div
h3
Client Cards
p
A Client Card is a unified profile that stores balances, active memberships, certificates, and participation in loyalty programs for a specific Client across one Location or an entire Chain.
a
Learn more →
small
Also known as: loyalty cards
div
h3
Memberships and their Types
p
A Membership is a prepaid product that gives a Client the right to receive a set number of services or discounts over a defined period. Membership Types define the rules: which services are included, how many visits are available, validity period, and usage restrictions.
a
Learn more →
small
Also known as: abonements, passes
div
h3
Certificates and their Types
p
A Certificate is a prepaid value or service voucher that can be used to pay for Services and Products. Certificate Types define how certificates are sold, accounted for, and redeemed, including validity period and usage restrictions.
a
Learn more →
small
Also known as: gift cards, vouchers
div
h3
Loyalty Programs
p
Loyalty programs combine bonus accrual, cumulative discounts and referral promotions to increase repeat visits and average spend. Any loyalty instrument must be linked to a specific Client Card so that bonuses, discounts, and balances are applied consistently across Visits.
a
Learn more →
small
Also known as: rewards, bonuses
div
h3
Client Accounts
p
Client Accounts are internal balances (deposits) stored on the Client Card. They are used to prepay future Visits, store overpayments, or keep store credit that can be partially or fully redeemed in subsequent Visits and sales.
a
Learn more →
small
Also known as: deposits
div
h3
Subdivisions
p
Subdivisions are higher-level groups used to organise Services across a Chain (for example, "Hair", "Nails", "Spa"). They help structure large catalogs, simplify analytics, and control visibility of Services in online booking.
a
Learn more →
small
Also known as: departments
div
h3
Custom Fields
p
Custom fields are additional attributes configured by the Location to store extra data in Visits or other entities (for example, medical notes, internal IDs). They extend the standard schema without changing the core data model.
a
Learn more →
small
Also known as: additional fields
div
h3
Tags
p
Tags allow users to group Clients, Appointments, or Events. They are used for analytics, targeted communications, and certain loyalty scenarios.
a
Learn more →
small
Also known as: labels, segments, categories
div
h3
Integrations HUB
p
Integrations HUB is a catalog of external applications and services connected to Altegio (telephony, messaging, CRM, loyalty, etc.). It standardises how integrations are discovered, installed, configured, and monetised.
a
Learn more →
small
Also known as: marketplace, apps
div
div
h2
Ready to Start Building?
p
Get your API key and start integrating in minutes
div
a
Get API Key
a
View Documentation
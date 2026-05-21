export type LegalDocumentKey = "terms" | "privacy" | "cookies" | "dpa";

export type LegalDocumentSection = {
  title: string;
  body?: string[];
  bullets?: string[];
  subsections?: {
    title: string;
    body?: string[];
    bullets?: string[];
  }[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  edition: string;
  intro?: string[];
  sections: LegalDocumentSection[];
};

const contactLines = [
  "Email: info@hiteam.net",
  "Phone: +971 55 719 5382",
  "Address: Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E.",
];

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: "Terms of Use",
    subtitle: "User Agreement",
    edition: "ALT TECHNOLOGIES L.L.C | HiTeam | v10.0 | June 2026",
    sections: [
      {
        title: "1. General Provisions",
        body: [
          "These Terms of Use govern the relationship between ALT TECHNOLOGIES L.L.C (HiTeam, the Company) and any person accessing the HiTeam platform.",
          "By using the Platform, you fully and unconditionally accept this Agreement. If you do not agree with any of the terms, please stop using the Service immediately.",
          "The Company may amend this Agreement unilaterally. Continued use of the Platform after publication of changes constitutes acceptance of those changes.",
          "By registering on HiTeam, you confirm that you use the Platform for business or professional purposes and not as a consumer for personal or household needs.",
          "All rights to the Platform, source code, design, algorithms, databases, trademarks and other intellectual property belong to the Company.",
        ],
      },
      {
        title: "2. Age Requirements",
        body: [
          "Use of the Platform is permitted only to persons who have reached the age of majority under the laws of their country of residence.",
          "By registering a company on HiTeam, you confirm that you are of legal age and authorised to enter into binding agreements on behalf of your organisation.",
        ],
      },
      {
        title: "3. Description of the Service",
        body: ["HiTeam is a workforce management platform that includes:"],
        bullets: [
          "company registration, organisational structure and work zones;",
          "inviting employees and managing profiles;",
          "scheduling and shift management;",
          "time and attendance tracking with facial recognition via Amazon Rekognition;",
          "SMS verification upon first login and in other security cases;",
          "geolocation control at shift start/end and throughout the shift in field mode;",
          "checklists, tasks and photo reports;",
          "analytics, reports and data export;",
          "mobile applications for iOS and Android;",
          "alternative verification by NFC and QR code upon request.",
        ],
      },
      {
        title: "4. Accounts, Passwords and Security",
        body: [
          "Each organisation may have only one HiTeam account. The account is personal and non-transferable.",
          "The User is fully responsible for all actions under their credentials, including actions by third parties who gained access due to insufficient security measures.",
          "The User must immediately notify the Company at info@hiteam.net of unauthorised access or other security breaches.",
          "Registration details must be accurate and up to date. False information may lead to account suspension without refund.",
        ],
      },
      {
        title: "5. Geographic Restrictions and Currency",
        body: [
          "The Platform is available to companies registered in jurisdictions where use of the service does not conflict with local law and international sanctions.",
          "The Company may deny registration or block an account without explanation or refund if Platform use conflicts with applicable sanctions or restrictions.",
          "Restriction: biometric verification is prohibited for employees working in Illinois, USA, due to BIPA requirements. The client company bears sole responsibility for compliance. NFC or QR verification is available for employees in Illinois.",
          "Payments are accepted exclusively in international currencies through Stripe. The Company is not responsible for currency conversion by the User's bank or payment system.",
        ],
      },
      {
        title: "6. Pricing",
        subsections: [
          {
            title: "6.1. Pricing model",
            body: [
              "The cost of access is determined by the number of employees and the selected subscription period. The current price list is available at hiteam.net/pricing.",
            ],
          },
          {
            title: "6.2. Regional pricing",
            body: [
              "The Company applies regional pricing depending on the User's country of registration. Current regional rates are available at hiteam.net/pricing.",
            ],
          },
          {
            title: "6.3. Price changes",
            body: [
              "The Company may change prices unilaterally without prior notice. New prices take effect from the next billing period.",
            ],
          },
          {
            title: "6.4. Taxes",
            body: [
              "Stated prices may not include local taxes such as VAT or GST, which may be added depending on jurisdiction.",
            ],
          },
        ],
      },
      {
        title: "7. Trial Period",
        body: [
          "The 7-day trial period is provided for full evaluation of the Platform.",
          "Upon registration, the User receives 7 calendar days of free access to the Platform's features.",
          "After the trial ends, the User must select a subscription period and number of employees. Payment is processed via Stripe.",
          "After the trial ends and the first payment is made, functional complaints are not accepted as grounds for refund.",
        ],
      },
      {
        title: "8. Licence Periods and Bonus Months",
        subsections: [
          {
            title: "8.1. Available subscription periods",
            bullets: [
              "Monthly subscription — payment each month based on the actual number of employees;",
              "6 months — 1 month free, total 7 months of access;",
              "12 months — 2 months free, total 14 months of access.",
            ],
          },
          {
            title: "8.2. Bonus months",
            body: [
              "Bonus months are an integral part of the licence period. They cannot be separated, transferred or converted to monetary value.",
            ],
          },
          {
            title: "8.3. Adding employees during the licence period",
            body: [
              "When employees are added during an active licence period, the cost is calculated proportionally to the days remaining until the end of the licence, including bonus months.",
            ],
          },
          {
            title: "8.4. Automatic renewal",
            body: [
              "After the licence period expires, including bonus months, the subscription automatically switches to monthly billing without additional notice from the Company.",
            ],
          },
          {
            title: "8.5. Cancellation",
            body: [
              "The User may cancel automatic renewal in the personal account. Cancellation stops the next charge but does not refund the current paid period.",
            ],
          },
        ],
      },
      {
        title: "9. Payment and No-Refund Policy",
        body: [
          "All payments are final and non-refundable under any circumstances.",
          "Payments are processed automatically via Stripe. By attaching a card, the User consents to automatic periodic charges.",
          "The Company does not store bank card details. Payment data security is ensured by Stripe under PCI DSS.",
          "In the event of a technical outage lasting more than 72 consecutive hours, the Company may, at its sole discretion, extend the subscription by an equivalent period.",
        ],
        bullets: [
          "non-use of the paid or bonus period;",
          "early termination at the User's initiative;",
          "functionality not meeting expectations;",
          "employee refusal to consent to biometrics or geolocation;",
          "technical failures, outages or temporary unavailability;",
          "price changes, automatic charges, suspension for breach, force majeure or any other reason.",
        ],
      },
      {
        title: "10. Prohibited Actions",
        body: ["The User is prohibited from:"],
        bullets: [
          "scraping, bots, web spiders, scripts or automated data extraction;",
          "creating a competing product based on Platform features, algorithms or design;",
          "copying ideas, functions, interface or graphic elements;",
          "sending spam or unwanted content;",
          "uploading malware or disrupting Platform operation;",
          "attempting unauthorised access to servers, databases or systems;",
          "using the Platform to store or transmit illegal or infringing content;",
          "reselling, sublicensing or commercially exploiting access without written permission.",
        ],
      },
      {
        title: "11. Intellectual Property and Prohibition on Copying",
        body: [
          "Copying, reproducing, distributing or otherwise using any Platform element without written permission is strictly prohibited.",
          "All rights to the Platform, source code, algorithms, design, databases, trademarks and intellectual property belong to the Company or licensors.",
          "The User receives a non-exclusive, non-transferable, revocable licence to use the Platform solely under this Agreement.",
        ],
      },
      {
        title: "12. Limitation of Liability",
        body: [
          "The Platform is provided as is. The Company is not liable for damages arising from use or inability to use the Service.",
          "The Company does not guarantee uninterrupted 24/7 operation, 100% facial recognition accuracy, absolute geolocation accuracy or delivery of SMS messages.",
          "The Company's total liability shall not exceed the amount paid by the User in the last 3 months.",
        ],
      },
      {
        title: "13. Data Breaches",
        body: [
          "The Company implements protective measures including TLS/SSL encryption, ISO 27001-compliant servers in the UAE and restricted access.",
          "Absolute protection cannot be guaranteed. The Company is not liable for breaches caused by third-party attacks, third-party vulnerabilities or User actions.",
          "If a breach is detected, affected Users will be notified within 72 hours. Such notice is not an admission of liability.",
          "Payment data security is the responsibility of Stripe. Biometric processing infrastructure security is the responsibility of Amazon Web Services.",
        ],
      },
      {
        title: "14. Alternative Verification Methods",
        body: [
          "NFC tags and QR codes are official equal alternatives to biometric verification. Employees may choose this method if they decline facial scanning.",
          "To activate NFC or QR verification, contact support at info@hiteam.net. The feature is activated individually.",
        ],
      },
      {
        title: "15. Mobile Applications",
        body: [
          "The Platform is available through the App Store and Google Play. Use is also governed by the terms of the respective stores.",
          "The app requests access to camera, geolocation and SMS. Declining permissions may make relevant features unavailable.",
          "The Company is not liable for limitations caused by Apple Inc. or Google LLC policies.",
        ],
      },
      {
        title: "16. Suspension and Termination",
        body: [
          "The Company may suspend an account and terminate access without prior notice and without refund for false information, credential sharing, fraud, unlawful use, late payment, chargeback or actions damaging the Company.",
          "Upon suspension, data is retained for 30 days and then deleted. During this period, the User may request data export.",
        ],
      },
      {
        title: "17. External Links and Third-Party Services",
        body: [
          "The Platform may contain links to third-party services including Stripe, Amazon Web Services and Umnico. The Company does not control their content, privacy policies or practices.",
        ],
      },
      {
        title: "18. Governing Law and Disputes",
        body: [
          "This Agreement is governed by the laws of the United Arab Emirates. All disputes shall be resolved in the courts of Dubai, UAE after a 30-day pre-litigation settlement attempt.",
        ],
      },
      {
        title: "19. Contact Information",
        bullets: contactLines,
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Data Protection Notice",
    edition: "ALT TECHNOLOGIES L.L.C | HiTeam | v10.0 | June 2026",
    sections: [
      {
        title: "1. Who We Are",
        body: [
          "The data controller is ALT TECHNOLOGIES L.L.C (HiTeam), Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E. We process data in accordance with UAE law and GDPR principles for clients in the EU.",
        ],
      },
      {
        title: "2. What Data We Collect",
        subsections: [
          {
            title: "2.1. Data of managers and administrators",
            bullets: [
              "name, surname, job title;",
              "corporate email and phone number;",
              "company details used to configure the Platform and for anonymised analytics;",
              "Google or Apple sign-in data: name, email and unique account identifier;",
              "tokenised payment details via Stripe;",
              "system activity logs.",
            ],
          },
          {
            title: "2.2. Employee data",
            bullets: [
              "name, surname, date of birth, job title and work schedule;",
              "mobile phone number for SMS verification;",
              "biometric facial template;",
              "device geolocation at shift start/end or throughout the shift in field mode;",
              "timestamps for clock-in, clock-out and breaks;",
              "photo reports attached to checklist tasks.",
            ],
          },
        ],
      },
      {
        title: "3. Biometric Data",
        body: [
          "Biometric data is a special category of personal data and is processed only with explicit employee consent.",
          "HiTeam uses Amazon Rekognition. The system creates a mathematical facial feature vector. Original photographs are not retained for permanent storage. Transfer to AWS is based on EU Standard Contractual Clauses.",
          "The purpose is solely employee identity verification at the start and end of working shifts.",
          "Biometric templates are stored on servers in the UAE and automatically deleted after 6 months.",
        ],
      },
      {
        title: "4. SMS Verification",
        body: [
          "The phone number is used for SMS verification upon first login and in other security cases.",
          "The phone number is not shared with third parties for commercial purposes.",
          "The Company is not liable for SMS non-delivery due to the User's mobile operator.",
        ],
      },
      {
        title: "5. Geolocation Data",
        subsections: [
          {
            title: "5.1. Standard mode",
            body: [
              "Geolocation is checked once at shift start and once at shift end to verify whether the device is within the configured work zone. Background tracking during the working day is not performed.",
            ],
          },
          {
            title: "5.2. Field mode",
            body: [
              "For mobile employees, the manager may activate geolocation tracking throughout the shift only with separate employee consent. Outside the shift, tracking is not performed.",
              "Geolocation data retention period: 6 months with automatic deletion.",
            ],
          },
        ],
      },
      {
        title: "6. Photo Reports from Checklists",
        body: [
          "Employees may attach photos to checklist tasks as confirmation of completion.",
          "The Company does not control the content of uploaded photos. Responsibility for lawful recording lies with the employee and employer.",
          "Photo report retention period: 6 months with automatic deletion.",
        ],
      },
      {
        title: "7. Sharing Data with Third Parties",
        bullets: [
          "Amazon Web Services (Amazon Rekognition) — biometric verification;",
          "Stripe Inc. — payment processing;",
          "SMS providers — verification messages;",
          "Umnico — customer support and feedback service;",
          "government authorities upon lawful request.",
        ],
        body: ["The Company does not sell data or share it with advertising networks."],
      },
      {
        title: "8. Data Retention",
        body: [
          "All data is stored on servers in the UAE. The Company may change retention periods unilaterally. The current Policy is available at hiteam.net/privacy.",
        ],
        bullets: [
          "biometric templates — 6 months;",
          "geolocation data — 6 months;",
          "photo reports — 6 months;",
          "employee date of birth — until account deletion + 30 days;",
          "manager account data — until account deletion + 30 days;",
          "payment data — according to Stripe and PCI DSS requirements.",
        ],
      },
      {
        title: "9. Security and Data Breaches",
        body: [
          "Protective measures include TLS/SSL encryption, ISO 27001-compliant data centres in the UAE and restricted access.",
          "The Company is not liable for breaches caused by third-party attacks, third-party vulnerabilities or User actions.",
          "Affected Users will be notified within 72 hours of a detected breach. Such notice is not an admission of liability.",
        ],
      },
      {
        title: "10. Data Subject Rights",
        body: [
          "You may request access, correction or deletion of your data, withdraw consent for biometric or geolocation processing, and file a complaint with the supervisory authority. Requests: info@hiteam.net",
        ],
      },
      {
        title: "11. Aggregated Data",
        body: [
          "The Company may use anonymised aggregated data for analytics, Platform improvement, behavioural pattern studies, reports and product development.",
        ],
      },
      {
        title: "12. Cookies",
        body: [
          "The website uses technical cookies necessary for operation and analytical cookies with the User's consent.",
        ],
      },
      {
        title: "13. Contact Information",
        bullets: [
          "Email: info@hiteam.net",
          "Address: Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    subtitle: "Website Cookies Notice",
    edition: "ALT TECHNOLOGIES L.L.C | HiTeam | v10.0 | June 2026",
    sections: [
      {
        title: "1. Cookies We Use",
        body: [
          "HiTeam uses technical cookies necessary for website and account operation, session security, language preferences and fraud prevention.",
          "HiTeam may use analytical cookies only with the User's consent to understand website performance and improve the product.",
        ],
      },
      {
        title: "2. Managing Cookies",
        body: [
          "You can restrict cookies in your browser settings. Disabling technical cookies may prevent some parts of the website or Platform from working correctly.",
        ],
      },
      {
        title: "3. Contact",
        bullets: ["Email: info@hiteam.net"],
      },
    ],
  },
  dpa: {
    title: "Data Processing Agreement",
    subtitle: "DPA",
    edition: "ALT TECHNOLOGIES L.L.C | HiTeam | v10.0 | June 2026",
    intro: [
      "This Data Processing Agreement is entered into between ALT TECHNOLOGIES L.L.C (HiTeam) as Data Processor and the client company as Data Controller, and forms an integral part of the Terms of Use.",
    ],
    sections: [
      {
        title: "1. Subject Matter",
        body: [
          "HiTeam processes personal data of the Controller's employees solely to provide time and attendance tracking, shift management, identity verification, SMS notifications and checklist completion services.",
        ],
      },
      {
        title: "2. Controller's Obligations",
        body: [
          "The Controller is responsible for the lawfulness of collecting biometric data, geolocation data and personal data of its employees in accordance with its jurisdiction.",
        ],
        bullets: [
          "the Controller is the lawful employer or authorised representative;",
          "before adding each employee, it has obtained explicit consent for biometric data, geolocation and phone number processing;",
          "employees have been informed about Amazon Rekognition, retention periods and servers in the UAE;",
          "Platform use complies with employment law in the country of registration;",
          "employee consents are retained and provided upon request.",
        ],
      },
      {
        title: "3. Processor's Obligations",
        bullets: [
          "process data only for purposes set out in this DPA;",
          "ensure confidentiality and security;",
          "not share data except with AWS, Stripe, SMS providers and Umnico;",
          "delete data after 6 months or upon written request;",
          "notify security incidents within 72 hours.",
        ],
      },
      {
        title: "4. Sub-Processors",
        bullets: [
          "Amazon Web Services (Amazon Rekognition) — biometric verification;",
          "Stripe Inc. — payment transactions;",
          "SMS providers — verification messages;",
          "Umnico — customer support and feedback service.",
        ],
      },
      {
        title: "5. Liability",
        body: [
          "HiTeam is not liable for data protection violations committed by the Controller. Such violations do not constitute grounds for a refund.",
        ],
      },
    ],
  },
};

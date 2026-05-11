export type KommoEntityType = 'leads' | 'contacts' | 'companies';

export type KommoCustomFieldType =
  | 'text'
  | 'numeric'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'date_time'
  | 'url'
  | 'textarea'
  | 'monetary';

export type KommoFieldSpec = {
  key: string;
  entityType: KommoEntityType;
  groupName: string;
  name: string;
  type: KommoCustomFieldType;
  sort: number;
  enums?: string[];
};

export const KOMMO_PIPELINE_NAME = 'HiTeam';

export const KOMMO_STAGE_SPECS = [
  { name: 'New Registration', sort: 10, color: '#99ccff' },
  { name: 'Trial Started', sort: 20, color: '#c1e0ff' },
  { name: 'Employees Invited', sort: 30, color: '#f9de7e' },
  { name: 'First Check-In Completed', sort: 40, color: '#fffd7f' },
  { name: 'Active Usage', sort: 50, color: '#deff81' },
  { name: 'Payment Pending', sort: 60, color: '#ffce5a' },
  { name: 'Paid Subscription', sort: 70, color: '#87f2c0' },
  { name: 'Reactivation', sort: 80, color: '#d6d8f9' },
  { name: 'Churn', sort: 90, color: '#cccccc' },
  { name: 'Support Needed', sort: 100, color: '#ff8f92' },
] as const;

export const KOMMO_TAGS = [
  'Trial',
  'Paid',
  'Expiring Soon',
  'No Activity',
  'High Engagement',
  'Enterprise',
  'Multi-Location',
  'Needs Support',
  'UAE',
  'English-speaking',
  'Russian-speaking',
] as const;

export const KOMMO_FIELD_SPECS: KommoFieldSpec[] = [
  { key: 'companyName', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Company Name', type: 'text', sort: 10 },
  { key: 'organizationId', entityType: 'leads', groupName: 'HiTeam - Company', name: 'HiTeam Organization ID', type: 'text', sort: 20 },
  { key: 'country', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Country', type: 'text', sort: 30 },
  { key: 'city', entityType: 'leads', groupName: 'HiTeam - Company', name: 'City', type: 'text', sort: 40 },
  { key: 'timezone', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Timezone', type: 'text', sort: 50 },
  { key: 'industry', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Industry', type: 'text', sort: 60 },
  { key: 'numberOfLocations', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Number of Locations', type: 'numeric', sort: 70 },
  { key: 'totalEmployees', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Total Employees', type: 'numeric', sort: 80 },
  { key: 'activeEmployees', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Active Employees', type: 'numeric', sort: 90 },
  { key: 'trialStatus', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Trial Status', type: 'checkbox', sort: 100 },
  { key: 'currentPlan', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Current Plan', type: 'text', sort: 110 },
  {
    key: 'subscriptionStatus',
    entityType: 'leads',
    groupName: 'HiTeam - Company',
    name: 'Subscription Status',
    type: 'select',
    sort: 120,
    enums: [
      'TRIAL',
      'ACTIVE',
      'PAYMENT_REQUIRED',
      'PAST_DUE',
      'CANCELED',
      'CANCELLED',
      'INCOMPLETE',
      'INCOMPLETE_EXPIRED',
      'UNPAID',
      'UNKNOWN',
    ],
  },
  {
    key: 'paymentStatus',
    entityType: 'leads',
    groupName: 'HiTeam - Company',
    name: 'Payment Status',
    type: 'select',
    sort: 130,
    enums: ['TRIAL', 'PENDING', 'PAID', 'FAILED', 'NOT_CONFIGURED'],
  },
  { key: 'trialStartDate', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Trial Start Date', type: 'date', sort: 140 },
  { key: 'trialEndDate', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Trial End Date', type: 'date', sort: 150 },
  { key: 'paidUntil', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Paid Until', type: 'date', sort: 160 },
  { key: 'lastActivityDate', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Last Activity Date', type: 'date_time', sort: 170 },
  { key: 'registrationDate', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Registration Date', type: 'date_time', sort: 180 },
  { key: 'referralSource', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Referral Source', type: 'text', sort: 190 },
  { key: 'salesManager', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Sales Manager', type: 'text', sort: 200 },
  { key: 'onboardingManager', entityType: 'leads', groupName: 'HiTeam - Company', name: 'Onboarding Manager', type: 'text', sort: 210 },

  { key: 'dashboardLink', entityType: 'leads', groupName: 'HiTeam - Product', name: 'HiTeam Dashboard Link', type: 'url', sort: 10 },
  { key: 'adminLink', entityType: 'leads', groupName: 'HiTeam - Product', name: 'HiTeam Admin Link', type: 'url', sort: 20 },
  { key: 'mobileAppInstalled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'HiTeam Mobile App Installed', type: 'checkbox', sort: 30 },
  { key: 'gpsTrackingEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'GPS Tracking Enabled', type: 'checkbox', sort: 40 },
  { key: 'faceRecognitionEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Face Recognition Enabled', type: 'checkbox', sort: 50 },
  { key: 'selfieVerificationEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Employee Selfie Verification Enabled', type: 'checkbox', sort: 60 },
  { key: 'checklistFeatureEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Checklist Feature Enabled', type: 'checkbox', sort: 70 },
  { key: 'notificationsEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Notifications Enabled', type: 'checkbox', sort: 80 },
  { key: 'payrollModuleEnabled', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Payroll Module Enabled', type: 'checkbox', sort: 90 },
  { key: 'activeDevices', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Number of Active Devices', type: 'numeric', sort: 100 },
  { key: 'lastEmployeeCheckIn', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Last Employee Check-In', type: 'date_time', sort: 110 },
  { key: 'lastEmployeeCheckOut', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Last Employee Check-Out', type: 'date_time', sort: 120 },
  { key: 'lastSyncStatus', entityType: 'leads', groupName: 'HiTeam - Product', name: 'Last Sync Status', type: 'text', sort: 130 },
  {
    key: 'integrationStatus',
    entityType: 'leads',
    groupName: 'HiTeam - Product',
    name: 'Integration Status',
    type: 'select',
    sort: 140,
    enums: ['ACTIVE', 'DISABLED', 'ERROR'],
  },

  { key: 'totalRegisteredEmployees', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Total Registered Employees', type: 'numeric', sort: 10 },
  { key: 'employeesInvited', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Employees Invited', type: 'numeric', sort: 20 },
  { key: 'employeesActivated', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Employees Activated', type: 'numeric', sort: 30 },
  { key: 'employeesWithFaceVerification', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Employees With Face Verification', type: 'numeric', sort: 40 },
  { key: 'employeesWithoutActivity', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Employees Without Activity', type: 'numeric', sort: 50 },
  { key: 'employeeRoster', entityType: 'leads', groupName: 'HiTeam - Employees', name: 'Employee Roster', type: 'textarea', sort: 60 },

  { key: 'subscriptionType', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Subscription Type', type: 'text', sort: 10 },
  { key: 'pricePerEmployee', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Price Per Employee', type: 'numeric', sort: 20 },
  { key: 'totalMonthlyPayment', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Total Monthly Payment', type: 'monetary', sort: 30 },
  {
    key: 'billingCycle',
    entityType: 'leads',
    groupName: 'HiTeam - Payment',
    name: 'Billing Cycle',
    type: 'select',
    sort: 40,
    enums: ['MONTHLY', 'ANNUAL', 'CUSTOM'],
  },
  { key: 'nextPaymentDate', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Next Payment Date', type: 'date', sort: 50 },
  { key: 'lastPaymentDate', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Last Payment Date', type: 'date', sort: 60 },
  { key: 'paymentMethod', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Payment Method', type: 'text', sort: 70 },
  { key: 'autoRenewal', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Auto Renewal', type: 'checkbox', sort: 80 },
  { key: 'paymentLink', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Payment Link', type: 'url', sort: 90 },
  { key: 'invoiceAttached', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Invoice Attached', type: 'checkbox', sort: 100 },
  { key: 'seatsUsed', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Seats Used', type: 'numeric', sort: 110 },
  { key: 'seatsPaid', entityType: 'leads', groupName: 'HiTeam - Payment', name: 'Seats Paid', type: 'numeric', sort: 120 },

  { key: 'lastLoginDate', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Last Login Date', type: 'date_time', sort: 10 },
  { key: 'lastAdminActivityDate', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Last Admin Activity Date', type: 'date_time', sort: 20 },
  { key: 'lastEmployeeActivityDate', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Last Employee Activity Date', type: 'date_time', sort: 30 },
  { key: 'checkInsToday', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Number of Check-Ins Today', type: 'numeric', sort: 40 },
  { key: 'lateEmployees', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Number of Late Employees', type: 'numeric', sort: 50 },
  { key: 'missedCheckIns', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Number of Missed Check-Ins', type: 'numeric', sort: 60 },
  { key: 'weeklyUsageScore', entityType: 'leads', groupName: 'HiTeam - Activity', name: 'Weekly Usage Score', type: 'numeric', sort: 70 },
  {
    key: 'engagementLevel',
    entityType: 'leads',
    groupName: 'HiTeam - Activity',
    name: 'Engagement Level',
    type: 'select',
    sort: 80,
    enums: ['LOW', 'MEDIUM', 'HIGH'],
  },

  { key: 'employeesLink', entityType: 'leads', groupName: 'HiTeam - Quick Links', name: 'Open Employees', type: 'url', sort: 10 },
  { key: 'billingLink', entityType: 'leads', groupName: 'HiTeam - Quick Links', name: 'Open Billing', type: 'url', sort: 20 },
  { key: 'checkInLogsLink', entityType: 'leads', groupName: 'HiTeam - Quick Links', name: 'Open Check-In Logs', type: 'url', sort: 30 },
  { key: 'branchesLink', entityType: 'leads', groupName: 'HiTeam - Quick Links', name: 'Open Branches', type: 'url', sort: 40 },

  { key: 'companyOrganizationId', entityType: 'companies', groupName: 'HiTeam - Company', name: 'HiTeam Organization ID', type: 'text', sort: 10 },
  { key: 'companyDashboardLink', entityType: 'companies', groupName: 'HiTeam - Company', name: 'HiTeam Dashboard Link', type: 'url', sort: 20 },
  { key: 'companyAdminLink', entityType: 'companies', groupName: 'HiTeam - Company', name: 'HiTeam Admin Link', type: 'url', sort: 30 },
  { key: 'companyTotalEmployees', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Total Employees', type: 'numeric', sort: 40 },
  { key: 'companyActiveEmployees', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Active Employees', type: 'numeric', sort: 50 },
  { key: 'companySeatsUsed', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Seats Used', type: 'numeric', sort: 60 },
  { key: 'companySubscriptionStatus', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Subscription Status', type: 'text', sort: 70 },
  { key: 'companyPaymentStatus', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Payment Status', type: 'text', sort: 80 },
  { key: 'companyLastActivityDate', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Last Activity Date', type: 'date_time', sort: 90 },
  { key: 'companyLocations', entityType: 'companies', groupName: 'HiTeam - Company', name: 'Number of Locations', type: 'numeric', sort: 100 },

  { key: 'employeeId', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'HiTeam Employee ID', type: 'text', sort: 10 },
  { key: 'employeeName', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Employee Name', type: 'text', sort: 20 },
  { key: 'employeePosition', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Position', type: 'text', sort: 30 },
  { key: 'employeeBranch', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Branch', type: 'text', sort: 40 },
  {
    key: 'employeeStatus',
    entityType: 'contacts',
    groupName: 'HiTeam - Employee',
    name: 'Status',
    type: 'select',
    sort: 50,
    enums: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'INVITED', 'PENDING_APPROVAL', 'REJECTED'],
  },
  { key: 'employeeLastCheckIn', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Last Check-In', type: 'date_time', sort: 60 },
  { key: 'employeeLastCheckOut', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Last Check-Out', type: 'date_time', sort: 70 },
  { key: 'employeeAppInstalled', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'App Installed', type: 'checkbox', sort: 80 },
  { key: 'employeeFaceVerificationActive', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Face Verification Active', type: 'checkbox', sort: 90 },
  { key: 'employeeGroup', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Group', type: 'text', sort: 100 },
  { key: 'employeeLastLogin', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Last Login Date', type: 'date_time', sort: 110 },
  { key: 'employeeAvatarUrl', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'Avatar URL', type: 'url', sort: 120 },
  { key: 'employeeLink', entityType: 'contacts', groupName: 'HiTeam - Employee', name: 'HiTeam Employee Link', type: 'url', sort: 130 },
];

import { pgTable, uuid, varchar, timestamp, boolean, text, jsonb, integer, date, numeric } from 'drizzle-orm/pg-core';

/**
 * Tenant-scoped base columns.
 * All tenant tables should spread these columns.
 */
export const tenantBaseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
};

/**
 * Example tenant-scoped table: users
 * In production, each tenant gets their own schema with these tables.
 */
export const users = pgTable('users', {
  ...tenantBaseColumns,
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const roles = pgTable('roles', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().default([]),
  isSystem: boolean('is_system').notNull().default(false),
});

export const userRoles = pgTable('user_roles', {
  ...tenantBaseColumns,
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  projectId: uuid('project_id'),
  locationId: uuid('location_id'),
});

export const refreshTokens = pgTable('refresh_tokens', {
  ...tenantBaseColumns,
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
});

export const auditLogs = pgTable('audit_logs', {
  ...tenantBaseColumns,
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
});

// ==========================================
// PHASE 2: PROPERTY & PROJECT STRUCTURE
// ==========================================

export const projects = pgTable('projects', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('planning'), // planning, active, completed, suspended
  address: text('address'),
});

export const blocks = pgTable('blocks', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 100 }).notNull(),
});

export const towers = pgTable('towers', {
  ...tenantBaseColumns,
  blockId: uuid('block_id').notNull().references(() => blocks.id),
  name: varchar('name', { length: 100 }).notNull(),
});

export const floors = pgTable('floors', {
  ...tenantBaseColumns,
  towerId: uuid('tower_id').notNull().references(() => towers.id),
  name: varchar('name', { length: 100 }).notNull(),
  floorNumber: integer('floor_number').notNull(),
});

export const unitCategories = pgTable('unit_categories', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 100 }).notNull(), // e.g., 2BHK, 3BHK, Villa, Plot
});

export const units = pgTable('units', {
  ...tenantBaseColumns,
  floorId: uuid('floor_id').notNull().references(() => floors.id),
  categoryId: uuid('category_id').references(() => unitCategories.id),
  number: varchar('number', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('available'), // available, reserved, booked, cancelled, completed, delivered
  areaSqft: numeric('area_sqft', { precision: 10, scale: 2 }),
  progress: numeric('progress', { precision: 5, scale: 2 }).notNull().default('0'), // 0.00 to 100.00
});

export const unitStatusHistory = pgTable('unit_status_history', {
  ...tenantBaseColumns,
  unitId: uuid('unit_id').notNull().references(() => units.id),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
});

// ==========================================
// PHASE 2: PLANNING LITE
// ==========================================

export const milestones = pgTable('milestones', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
});

export const tasks = pgTable('tasks', {
  ...tenantBaseColumns,
  milestoneId: uuid('milestone_id').notNull().references(() => milestones.id),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  progress: integer('progress').notNull().default(0), // 0 to 100
});

export const taskDependencies = pgTable('task_dependencies', {
  ...tenantBaseColumns,
  predecessorId: uuid('predecessor_id').notNull().references(() => tasks.id),
  successorId: uuid('successor_id').notNull().references(() => tasks.id),
  type: varchar('type', { length: 10 }).notNull().default('FS'), // FS (Finish-to-Start), SS, FF, SF
});

export const boqItems = pgTable('boq_items', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  uom: varchar('uom', { length: 50 }).notNull(), // Unit of Measure
  rate: numeric('rate', { precision: 12, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
});

export const drawings = pgTable('drawings', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 50 }).notNull(),
  url: text('url').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const rfis = pgTable('rfis', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  raisedBy: uuid('raised_by').references(() => users.id),
});

export const issues = pgTable('issues', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  priority: varchar('priority', { length: 50 }).notNull().default('medium'),
  assignedTo: uuid('assigned_to').references(() => users.id),
});

export const approvals = pgTable('approvals', {
  ...tenantBaseColumns,
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // e.g., 'Drawing', 'Issue', 'Task'
  resourceId: uuid('resource_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected
  approvedBy: uuid('approved_by').references(() => users.id),
});

// ==========================================
// PHASE 3: CRM & SALES PIPELINE
// ==========================================

export const leadSources = pgTable('lead_sources', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // web, meta, whatsapp, referral
});

export const campaigns = pgTable('campaigns', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budget: numeric('budget', { precision: 12, scale: 2 }),
});

export const leads = pgTable('leads', {
  ...tenantBaseColumns,
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  sourceId: uuid('source_id').references(() => leadSources.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  status: varchar('status', { length: 50 }).notNull().default('Lead'), // Lead, Qualified, Site Visit, Negotiation, Booking, Agreement, Customer
  probability: integer('probability').default(10), // 0 to 100
  expectedRevenue: numeric('expected_revenue', { precision: 14, scale: 2 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
});

export const leadActivities = pgTable('lead_activities', {
  ...tenantBaseColumns,
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  type: varchar('type', { length: 50 }).notNull(), // call, email, site_visit, note, transition
  notes: text('notes'),
  performedBy: uuid('performed_by').references(() => users.id), // Can be null if system/webhook
});

export const followUps = pgTable('follow_ups', {
  ...tenantBaseColumns,
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, completed
  assignedTo: uuid('assigned_to').references(() => users.id),
});

export const bookings = pgTable('bookings', {
  ...tenantBaseColumns,
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  unitId: uuid('unit_id').notNull().references(() => units.id),
  bookingAmount: numeric('booking_amount', { precision: 14, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, cancelled, converted
  bookedAt: timestamp('booked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agreements = pgTable('agreements', {
  ...tenantBaseColumns,
  bookingId: uuid('booking_id').notNull().references(() => bookings.id),
  url: text('url'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, signed
});

export const kycDocuments = pgTable('kyc_documents', {
  ...tenantBaseColumns,
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  documentType: varchar('document_type', { length: 50 }).notNull(), // aadhaar, pan, passport
  documentNumber: text('document_number').notNull(), // Encrypted!
  documentUrl: text('document_url'),
});

// ==========================================
// PHASE 4: CONSTRUCTION PROGRESS
// ==========================================

export const activityTemplates = pgTable('activity_templates', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  defaultWeightPercentage: numeric('default_weight_percentage', { precision: 5, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const unitActivities = pgTable('unit_activities', {
  ...tenantBaseColumns,
  unitId: uuid('unit_id').notNull().references(() => units.id),
  templateId: uuid('template_id').notNull().references(() => activityTemplates.id),
  name: varchar('name', { length: 255 }).notNull(),
  weightPercentage: numeric('weight_percentage', { precision: 5, scale: 2 }).notNull(),
  completionPercentage: numeric('completion_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, in_progress, completed
});

export const activityChecklists = pgTable('activity_checklists', {
  ...tenantBaseColumns,
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id),
  itemText: text('item_text').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
});

export const progressUpdates = pgTable('progress_updates', {
  ...tenantBaseColumns,
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id),
  notes: text('notes'),
  reportedPercentage: numeric('reported_percentage', { precision: 5, scale: 2 }).notNull(),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
});

export const progressPhotos = pgTable('progress_photos', {
  ...tenantBaseColumns,
  updateId: uuid('update_id').notNull().references(() => progressUpdates.id),
  photoUrl: text('photo_url').notNull(),
});

export const inspections = pgTable('inspections', {
  ...tenantBaseColumns,
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id),
  status: varchar('status', { length: 50 }).notNull(), // pass, fail
  notes: text('notes'),
  inspectedBy: uuid('inspected_by').notNull().references(() => users.id),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }).notNull().defaultNow(),
});

export const engineerApprovals = pgTable('engineer_approvals', {
  ...tenantBaseColumns,
  activityId: uuid('activity_id').notNull().references(() => unitActivities.id),
  approvedPercentage: numeric('approved_percentage', { precision: 5, scale: 2 }).notNull(),
  notes: text('notes'),
  approvedBy: uuid('approved_by').notNull().references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// PHASE 5: PAYMENT-VS-PROGRESS ENGINE
// ==========================================

export const paymentPlans = pgTable('payment_plans', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
});

export const paymentMilestones = pgTable('payment_milestones', {
  ...tenantBaseColumns,
  planId: uuid('plan_id').notNull().references(() => paymentPlans.id),
  name: varchar('name', { length: 255 }).notNull(),
  thresholdPercentage: numeric('threshold_percentage', { precision: 5, scale: 2 }).notNull(),
  installmentPercentage: numeric('installment_percentage', { precision: 5, scale: 2 }).notNull(),
  isTimeBased: boolean('is_time_based').notNull().default(false),
});

export const unitPaymentPlans = pgTable('unit_payment_plans', {
  ...tenantBaseColumns,
  unitId: uuid('unit_id').notNull().references(() => units.id),
  planId: uuid('plan_id').notNull().references(() => paymentPlans.id),
  totalValue: numeric('total_value', { precision: 14, scale: 2 }).notNull(),
});

export const demandLetters = pgTable('demand_letters', {
  ...tenantBaseColumns,
  unitId: uuid('unit_id').notNull().references(() => units.id),
  milestoneId: uuid('milestone_id').notNull().references(() => paymentMilestones.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, demanded, paid, cancelled
  pdfUrl: text('pdf_url'),
  demandedAt: timestamp('demanded_at', { withTimezone: true }),
});

export const receipts = pgTable('receipts', {
  ...tenantBaseColumns,
  demandLetterId: uuid('demand_letter_id').notNull().references(() => demandLetters.id),
  amountReceived: numeric('amount_received', { precision: 14, scale: 2 }).notNull(),
  paymentMode: varchar('payment_mode', { length: 50 }).notNull(), // bank_transfer, cheque, cash
  referenceNumber: varchar('reference_number', { length: 100 }),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationLogs = pgTable('notification_logs', {
  ...tenantBaseColumns,
  type: varchar('type', { length: 50 }).notNull(), // email, whatsapp, sms
  recipient: varchar('recipient', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // sent, failed
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// PHASE 6: PROCUREMENT
// ==========================================

export const vendors = pgTable('vendors', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  taxId: varchar('tax_id', { length: 50 }),
  score: integer('score').default(0),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const rfqs = pgTable('rfqs', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, published, closed
});

export const quotations = pgTable('quotations', {
  ...tenantBaseColumns,
  rfqId: uuid('rfq_id').notNull().references(() => rfqs.id),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('submitted'), // submitted, accepted, rejected
});

export const purchaseOrders = pgTable('purchase_orders', {
  ...tenantBaseColumns,
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  poNumber: varchar('po_number', { length: 100 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, approved, issued, fulfilled
});

export const poLines = pgTable('po_lines', {
  ...tenantBaseColumns,
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id),
  itemId: uuid('item_id').notNull().references(() => boqItems.id),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  rate: numeric('rate', { precision: 12, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
});

// ==========================================
// PHASE 7: HRMS
// ==========================================

export const employees = pgTable('employees', {
  ...tenantBaseColumns,
  userId: uuid('user_id').references(() => users.id),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  salaryBasis: varchar('salary_basis', { length: 50 }).notNull().default('monthly'), // monthly, daily
  baseSalary: numeric('base_salary', { precision: 14, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const contractors = pgTable('contractors', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  agencyName: varchar('agency_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const attendance = pgTable('attendance', {
  ...tenantBaseColumns,
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  date: date('date').notNull(),
  punchIn: timestamp('punch_in', { withTimezone: true }),
  punchOut: timestamp('punch_out', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull().default('present'), // present, absent, half_day, leave
  locationLat: numeric('location_lat', { precision: 10, scale: 7 }),
  locationLng: numeric('location_lng', { precision: 10, scale: 7 }),
});

export const labourAttendance = pgTable('labour_attendance', {
  ...tenantBaseColumns,
  contractorId: uuid('contractor_id').notNull().references(() => contractors.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  date: date('date').notNull(),
  headcount: integer('headcount').notNull(),
  notes: text('notes'),
});

export const leaveRequests = pgTable('leave_requests', {
  ...tenantBaseColumns,
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // sick, casual, earned
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected
});

export const payrollRuns = pgTable('payroll_runs', {
  ...tenantBaseColumns,
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, processed, paid
});

export const payslips = pgTable('payslips', {
  ...tenantBaseColumns,
  payrollId: uuid('payroll_id').notNull().references(() => payrollRuns.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  grossPay: numeric('gross_pay', { precision: 14, scale: 2 }).notNull(),
  deductions: numeric('deductions', { precision: 14, scale: 2 }).notNull().default('0'),
  netPay: numeric('net_pay', { precision: 14, scale: 2 }).notNull(),
});

// ==========================================
// PHASE 8: OPERATIONAL ACCOUNTING
// ==========================================

export const accounts = pgTable('accounts', {
  ...tenantBaseColumns,
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // asset, liability, equity, revenue, expense
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const transactions = pgTable('transactions', {
  ...tenantBaseColumns,
  date: date('date').notNull(),
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }), // e.g., Invoice #, Receipt #
  status: varchar('status', { length: 50 }).notNull().default('posted'), // draft, posted, voided
  createdBy: uuid('created_by').references(() => users.id),
});

export const journalEntries = pgTable('journal_entries', {
  ...tenantBaseColumns,
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 14, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const expenses = pgTable('expenses', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  submittedBy: uuid('submitted_by').references(() => users.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, paid
});

export const vendorPayments = pgTable('vendor_payments', {
  ...tenantBaseColumns,
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  reference: varchar('reference', { length: 100 }),
});

// ==========================================
// PHASE 10: INVENTORY
// ==========================================

export const materials = pgTable('materials', {
  ...tenantBaseColumns,
  name: varchar('name', { length: 255 }).notNull(),
  uom: varchar('uom', { length: 50 }).notNull(), // Unit of Measure (e.g. kg, tons, pieces)
  category: varchar('category', { length: 100 }),
  reorderLevel: numeric('reorder_level', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
});

export const warehouses = pgTable('warehouses', {
  ...tenantBaseColumns,
  projectId: uuid('project_id').references(() => projects.id), // optional, could be central
  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }),
});

export const stockLevels = pgTable('stock_levels', {
  ...tenantBaseColumns,
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  materialId: uuid('material_id').notNull().references(() => materials.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull().default('0'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  ...tenantBaseColumns,
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  materialId: uuid('material_id').notNull().references(() => materials.id),
  type: varchar('type', { length: 50 }).notNull(), // GRN, ISSUE, TRANSFER, RETURN
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull(), // positive for GRN/RETURN, negative for ISSUE
  referenceId: varchar('reference_id', { length: 100 }), // PO number, Issue Slip
  date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid('recorded_by').references(() => users.id),
});

// ─── ARIA Core Types ─────────────────────────────────────────────────────────

export type EmailProvider = 'GMAIL' | 'OUTLOOK'
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type EmailCategory = 'MEETING' | 'TASK' | 'CRITICAL' | 'INFO' | 'SPAM' | 'NEWSLETTER' | 'INVOICE' | 'LEAD'
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

// ─── Unified Email Model ──────────────────────────────────────────────────────

export interface UnifiedEmail {
  id: string
  userId: string
  threadId?: string
  provider: EmailProvider
  externalId: string
  subject: string
  bodyText: string
  bodyHtml?: string
  fromEmail: string
  fromName?: string
  toEmails: string[]
  ccEmails: string[]
  isRead: boolean
  isStarred: boolean
  isSnoozed: boolean
  snoozeUntil?: Date
  labels: string[]
  hasAttachments: boolean
  receivedAt: Date
  analysis?: EmailAnalysis
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export interface EmailAnalysis {
  id: string
  emailId: string
  priority: Priority
  category: EmailCategory
  intent: string
  summary: string
  deadline?: Date
  deadlineText?: string
  amount?: string
  sentiment: Sentiment
  urgencyScore: number  // 1-10
  suggestedAction: string
  meetingDetected: boolean
  meetingTime?: string
  meetingParticipants: string[]
  taskExtracted: boolean
  taskText?: string
  confidenceScore: number  // 0-1
  replyShort?: string
  replyProfessional?: string
  replyFriendly?: string
  processingMs?: number
}

// ─── Provider Interface (Abstraction Layer) ───────────────────────────────────

export interface EmailProviderInterface {
  provider: EmailProvider
  fetchEmails(options: FetchEmailsOptions): Promise<UnifiedEmail[]>
  fetchEmail(externalId: string): Promise<UnifiedEmail | null>
  sendEmail(options: SendEmailOptions): Promise<void>
  markAsRead(externalId: string): Promise<void>
  fetchThreads(limit?: number): Promise<Thread[]>
  getCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]>
  createCalendarEvent(event: CreateCalendarEventOptions): Promise<CalendarEvent>
  getHistoryId?(): Promise<string>   // Gmail
  getDeltaLink?(): Promise<string>   // Outlook
}

export interface FetchEmailsOptions {
  limit?: number
  pageToken?: string
  query?: string
  since?: Date
  labelIds?: string[]
}

export interface SendEmailOptions {
  to: string[]
  cc?: string[]
  subject: string
  body: string
  html?: string
  replyToId?: string
  threadId?: string
}

export interface Thread {
  id: string
  externalId: string
  subject: string
  participants: string[]
  messageCount: number
  lastEmailAt: Date
}

export interface CalendarEvent {
  id: string
  externalId?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  meetingUrl?: string
  participants: string[]
}

export interface CreateCalendarEventOptions {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  participants: string[]
  location?: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  userId: string
  emailId?: string
  title: string
  description?: string
  dueDate?: Date
  priority: Priority
  status: TaskStatus
  source: 'AI_GENERATED' | 'MANUAL' | 'EMAIL_RULE'
  createdAt: Date
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextPageToken?: string
}

// ─── AI Agent Types ───────────────────────────────────────────────────────────

export interface ClassificationInput {
  subject: string
  bodyText: string
  fromEmail: string
  fromName?: string
}

export interface ClassificationOutput {
  priority: Priority
  category: EmailCategory
  intent: string
  summary: string
  deadlineText?: string
  amount?: string
  sentiment: Sentiment
  urgencyScore: number
  suggestedAction: string
  meetingDetected: boolean
  meetingTime?: string
  meetingParticipants: string[]
  taskText?: string
  taskExtracted: boolean
  confidenceScore: number
}

export interface ReplyGenerationInput {
  subject: string
  bodyText: string
  fromName?: string
  fromEmail: string
  analysis?: ClassificationOutput
}

export interface ReplyGenerationOutput {
  short: string
  professional: string
  friendly: string
}

export interface BriefingInput {
  emails: Array<{ sender: string; subject: string; category: string; priority: string }>
  todayEvents: CalendarEvent[]
  pendingTasks: Task[]
  waitingReplies: number
}

// ─── Integration ──────────────────────────────────────────────────────────────

export interface Integration {
  id: string
  userId: string
  provider: EmailProvider
  email: string
  isActive: boolean
  lastSyncAt?: Date
}

// ─── Queue Job Types ──────────────────────────────────────────────────────────

export interface EmailSyncJob {
  userId: string
  integrationId: string
  provider: EmailProvider
  isInitial: boolean
}

export interface EmailAnalysisJob {
  emailId: string
  userId: string
}

export interface BriefingJob {
  userId: string
  date: string
}

export interface WeeklyReportJob {
  userId?: string
  weekStart?: string
  weekEnd?: string
  isGlobalCron?: boolean
}

// ─── Email Template ───────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string
  userId: string
  name: string
  subject: string
  body: string
  variables: string[]
  category?: string
  useCount: number
  createdAt: string
  updatedAt: string
}

// ─── Follow-up Reminder ───────────────────────────────────────────────────────

export interface FollowupReminder {
  id: string
  userId: string
  emailId: string
  dueAt: string
  note?: string
  isDone: boolean
  createdAt: string
  email?: {
    id: string
    subject: string
    fromName?: string
    fromEmail: string
  }
}

// ─── Scheduled Email ──────────────────────────────────────────────────────────

export interface ScheduledEmail {
  id: string
  toEmail: string
  subject: string
  body: string
  scheduledAt: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  createdAt: string
}

// ─── Draft Email (Approval Queue) ────────────────────────────────────────────

export interface DraftEmail {
  id: string
  userId: string
  toEmail: string
  subject: string
  body: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT'
  source: 'RULE' | 'WEBHOOK' | 'BRAIN_DUMP'
  triggerType?: string
  triggerData?: string
  ruleId?: string
  sourceEmailId?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Brain Dump ───────────────────────────────────────────────────────────────

export interface BrainDumpResult {
  tasks: Array<{
    title: string
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate?: string
    description?: string
  }>
  contactNotes: Array<{
    email: string
    note: string
  }>
  draftEmails: Array<{
    toEmail: string
    subject: string
    body: string
  }>
  summary: string
}

// ─── Morning Briefing ─────────────────────────────────────────────────────────

export interface DailyBriefingData {
  date: string
  briefingText: string
  agenda: AgendaItem[]
  criticalEmails: Array<{ subject: string; from: string; priority: string }>
  pendingTasks: Array<{ title: string; priority: string; dueDate?: string }>
  pendingDrafts: number
  contactNotes: Array<{ email: string; note: string; aiSummary?: string }>
  knowledgeSummary: string
}

export interface AgendaItem {
  id: string
  title: string
  startTime: string
  endTime: string
  participants: string[]
  location?: string
  meetingUrl?: string
  prepNotes?: string
}

// ─── Webhook Trigger ──────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string          // e.g. 'invoice.paid', 'lead.created'
  source?: string        // e.g. 'stripe', 'zapier'
  customerEmail?: string
  customerName?: string
  amount?: number
  currency?: string
  description?: string
  metadata?: Record<string, string>
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  title?: string
}

// ─── Zustand Store Types ──────────────────────────────────────────────────────

export interface AppStore {
  selectedEmailId: string | null
  setSelectedEmail: (id: string | null) => void

  commandOpen: boolean
  setCommandOpen: (open: boolean) => void

  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  rightPanel: 'analysis' | 'reply' | 'meeting'
  setRightPanel: (panel: 'analysis' | 'reply' | 'meeting') => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  emailFilter: string
  setEmailFilter: (f: string) => void

  focusMode: boolean
  setFocusMode: (v: boolean) => void

  contactPanelEmail: string | null
  setContactPanelEmail: (email: string | null) => void

  newEmailsCount: number
  setNewEmailsCount: (n: number) => void

  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void

  composeOpen: boolean
  setComposeOpen: (open: boolean) => void

  batchMode: boolean
  setBatchMode: (v: boolean) => void

  smartSearchMode: boolean
  setSmartSearchMode: (v: boolean) => void

  aiPanelOpen: boolean
  setAiPanelOpen: (open: boolean) => void

  // Approval Queue
  approvalQueueOpen: boolean
  setApprovalQueueOpen: (open: boolean) => void

  // Brain Dump
  brainDumpMode: boolean
  setBrainDumpMode: (v: boolean) => void
  brainDumpResult: import('./index').BrainDumpResult | null
  setBrainDumpResult: (r: import('./index').BrainDumpResult | null) => void
}

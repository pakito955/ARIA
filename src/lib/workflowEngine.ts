/**
 * ARIA Workflow Engine
 * Evaluates EmailRules against a newly analysed email and executes matching actions.
 */

import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerField = 'from' | 'subject' | 'body' | 'category' | 'priority' | 'sentiment' | 'hasAttachment' | string
type TriggerOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'is' | string
type RuleAction = 'archive' | 'markRead' | 'createTask' | 'snooze' | 'label' | 'forward' | 'notifyWebhook' | 'autoReply' | 'setVip' | string

interface EvaluatedRule {
  ruleId: string
  ruleName: string
  action: RuleAction
  matched: boolean
}

// ─── Field resolver ───────────────────────────────────────────────────────────

function resolveField(
  email: {
    fromEmail: string
    fromName: string | null
    subject: string
    bodyText: string
    labels: string
  },
  analysis: {
    category: string
    priority: string
    sentiment: string
  } | null,
  triggerField: TriggerField
): string {
  switch (triggerField) {
    case 'from':
      return `${email.fromEmail} ${email.fromName ?? ''}`.toLowerCase()
    case 'subject':
      return email.subject.toLowerCase()
    case 'body':
      return email.bodyText.toLowerCase()
    case 'category':
      return (analysis?.category ?? '').toLowerCase()
    case 'priority':
      return (analysis?.priority ?? '').toLowerCase()
    case 'sentiment':
      return (analysis?.sentiment ?? '').toLowerCase()
    case 'hasAttachment':
      // Not applicable for string matching — treat as pass-through empty string
      return ''
    // Legacy / extended fields accepted by the engine
    case 'any':
      return `${email.fromEmail} ${email.fromName ?? ''} ${email.subject} ${email.bodyText}`.toLowerCase()
    default:
      return ''
  }
}

// ─── Operator evaluator ───────────────────────────────────────────────────────

function evaluateOperator(fieldValue: string, operator: TriggerOperator, triggerValue: string): boolean {
  const value = triggerValue.toLowerCase()
  switch (operator) {
    case 'contains':
      return fieldValue.includes(value)
    case 'equals':
      return fieldValue === value
    case 'startsWith':
      return fieldValue.startsWith(value)
    case 'endsWith':
      return fieldValue.endsWith(value)
    case 'is':
      return fieldValue === value
    default:
      return false
  }
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function evaluateRulesForEmail(emailId: string, userId: string): Promise<void> {
  // Fetch all active (enabled) rules for the user
  const rules = await prisma.emailRule.findMany({
    where: { userId, enabled: true },
  })

  if (rules.length === 0) return

  // Fetch the email with its analysis
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { analysis: true },
  })

  if (!email) {
    console.warn(`[WorkflowEngine] Email ${emailId} not found — skipping rule evaluation`)
    return
  }

  const fired: EvaluatedRule[] = []

  for (const rule of rules) {
    try {
      const fieldValue = resolveField(email, email.analysis, rule.triggerField)
      const matched = evaluateOperator(fieldValue, rule.triggerOperator, rule.triggerValue)

      if (!matched) continue

      // ── Execute action ────────────────────────────────────────────────────
      await executeAction(email, userId, rule.action as RuleAction, rule.actionValue ?? null)

      // Increment trigger stats on the rule
      await prisma.emailRule.update({
        where: { id: rule.id },
        data: {
          triggerCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      })

      fired.push({ ruleId: rule.id, ruleName: rule.name, action: rule.action, matched: true })
    } catch (err) {
      console.error(`[WorkflowEngine] Error executing rule "${rule.name}" (${rule.id}):`, err)
    }
  }

  if (fired.length > 0) {
    console.log(
      `[WorkflowEngine] Email ${emailId} matched ${fired.length} rule(s): ${fired.map((r) => `"${r.ruleName}" → ${r.action}`).join(', ')}`
    )
  }
}

// ─── Action executor ──────────────────────────────────────────────────────────

async function executeAction(
  email: {
    id: string
    userId: string
    labels: string
    isRead: boolean
    folder: string
    isArchived: boolean
  },
  userId: string,
  action: RuleAction,
  actionValue: string | null
): Promise<void> {
  switch (action) {
    // ── archive ──────────────────────────────────────────────────────────────
    case 'archive': {
      await prisma.email.update({
        where: { id: email.id },
        data: { folder: 'ARCHIVE', isArchived: true },
      })
      break
    }

    // ── markRead ─────────────────────────────────────────────────────────────
    case 'markRead':
    // Legacy alias from task spec
    case 'mark_read': {
      await prisma.email.update({
        where: { id: email.id },
        data: { isRead: true },
      })
      break
    }

    // ── label ─────────────────────────────────────────────────────────────────
    case 'label': {
      if (!actionValue) break
      try {
        const existing: string[] = JSON.parse(email.labels || '[]')
        if (!existing.includes(actionValue)) {
          existing.push(actionValue)
          await prisma.email.update({
            where: { id: email.id },
            data: { labels: JSON.stringify(existing) },
          })
        }
      } catch {
        // labels field not parseable — skip gracefully
      }
      break
    }

    // ── move (legacy alias) — update folder ───────────────────────────────────
    case 'move': {
      if (!actionValue) break
      await prisma.email.update({
        where: { id: email.id },
        data: { folder: actionValue },
      })
      break
    }

    // ── createTask ────────────────────────────────────────────────────────────
    case 'createTask':
    // Legacy alias from task spec
    case 'task': {
      await prisma.task.create({
        data: {
          userId,
          emailId: email.id,
          title: actionValue || 'Follow up on email',
          status: 'TODO',
          source: 'AI_GENERATED',
        },
      })
      break
    }

    // ── snooze ────────────────────────────────────────────────────────────────
    case 'snooze': {
      // actionValue is expected to be hours from now (string number)
      const hours = actionValue ? parseInt(actionValue, 10) : 24
      const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
      await prisma.email.update({
        where: { id: email.id },
        data: { isSnoozed: true, snoozeUntil, snoozedUntil: snoozeUntil },
      })
      break
    }

    // ── setVip ────────────────────────────────────────────────────────────────
    case 'setVip': {
      // Upsert the sender as a VIP contact
      const emailRecord = await prisma.email.findUnique({
        where: { id: email.id },
        select: { fromEmail: true, fromName: true },
      })
      if (emailRecord) {
        await prisma.vipContact.upsert({
          where: { userId_email: { userId, email: emailRecord.fromEmail } },
          create: {
            userId,
            email: emailRecord.fromEmail,
            name: emailRecord.fromName ?? undefined,
            reason: 'Auto-added by rule',
          },
          update: {},
        })
      }
      break
    }

    // ── forward ───────────────────────────────────────────────────────────────
    case 'forward': {
      // Forward is a send-side action that requires provider context — log for now
      console.log(`[WorkflowEngine] forward action for email ${email.id} to ${actionValue ?? '(no address)'} — queuing not yet implemented`)
      break
    }

    // ── notifyWebhook ─────────────────────────────────────────────────────────
    case 'notifyWebhook': {
      if (!actionValue) break
      try {
        const emailRecord = await prisma.email.findUnique({
          where: { id: email.id },
          select: { subject: true, fromEmail: true, receivedAt: true },
        })
        await fetch(actionValue, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'RULE_TRIGGERED',
            emailId: email.id,
            subject: emailRecord?.subject,
            from: emailRecord?.fromEmail,
            receivedAt: emailRecord?.receivedAt,
          }),
        })
      } catch (err) {
        console.error(`[WorkflowEngine] notifyWebhook failed for ${actionValue}:`, err)
      }
      break
    }

    // ── autoReply ─────────────────────────────────────────────────────────────
    case 'autoReply': {
      // Create a draft in the approval queue for human review
      const emailRecord = await prisma.email.findUnique({
        where: { id: email.id },
        select: { fromEmail: true, subject: true },
      })
      if (emailRecord) {
        await prisma.draftEmail.create({
          data: {
            userId,
            toEmail: emailRecord.fromEmail,
            subject: `Re: ${emailRecord.subject}`,
            body: actionValue || '',
            status: 'PENDING',
            source: 'RULE',
            triggerType: 'autoReply',
            sourceEmailId: email.id,
          },
        })
      }
      break
    }

    // ── notify (legacy no-op) ─────────────────────────────────────────────────
    case 'notify': {
      console.log(`[WorkflowEngine] notify action (no-op) for email ${email.id}`)
      break
    }

    default: {
      console.log(`[WorkflowEngine] Unknown action "${action}" for email ${email.id} — skipping`)
    }
  }
}

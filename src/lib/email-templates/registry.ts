import type { ComponentType } from 'react'
import { template as campaignActivatedTemplate } from './campaign-activated'
import { template as campaignSubmittedTemplate } from './campaign-submitted'
import { template as campaignApprovedTemplate } from './campaign-approved'
import { template as campaignRejectedTemplate } from './campaign-rejected'
import { template as bankTransferApprovedTemplate } from './bank-transfer-approved'
import { template as installationJobAvailableTemplate } from './installation-job-available'
import { template as obstacleReportedTemplate } from './obstacle-reported'
import { template as briefProposalReceivedTemplate } from './brief-proposal-received'
import { template as briefProposalReceivedIndividualTemplate } from './brief-proposal-received-individual'
import { template as stripeReminderTemplate } from './stripe-reminder'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'campaign-activated': campaignActivatedTemplate,
  'campaign-submitted': campaignSubmittedTemplate,
  'campaign-approved': campaignApprovedTemplate,
  'campaign-rejected': campaignRejectedTemplate,
  'bank-transfer-approved': bankTransferApprovedTemplate,
  'installation-job-available': installationJobAvailableTemplate,
  'obstacle-reported': obstacleReportedTemplate,
  'brief-proposal-received': briefProposalReceivedTemplate,
  'brief-proposal-received-individual': briefProposalReceivedIndividualTemplate,
  'stripe-reminder': stripeReminderTemplate,
}

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
import { template as briefProposalAcceptedTemplate } from './brief-proposal-accepted'
import { template as briefProposalRejectedTemplate } from './brief-proposal-rejected'
import { template as walletTopupAlertTemplate } from './wallet-topup-alert'
import { template as vehicleStatusTemplate } from './vehicle-status'
import { template as payeeCertificationTemplate } from './payee-certification'
import { template as campaignOpportunityTemplate } from './campaign-opportunity'
import { template as campaignPaymentReminderTemplate } from './campaign-payment-reminder'
import { template as campaignExpiredNoticeTemplate } from './campaign-expired-notice'
import { template as installationOverdueTemplate } from './installation-overdue'
import { template as gpsInactivityAlertTemplate } from './gps-inactivity-alert'
import { template as enterpriseLeadNotifyTemplate } from './enterprise-lead-notify'
import { template as enterpriseLeadConfirmTemplate } from './enterprise-lead-confirm'
import { template as briefCreatedTemplate } from './brief-created'
import { template as briefCampaignConfirmedTemplate } from './brief-campaign-confirmed'

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
  'brief-proposal-accepted': briefProposalAcceptedTemplate,
  'brief-proposal-rejected': briefProposalRejectedTemplate,
  'wallet-topup-alert': walletTopupAlertTemplate,
  'vehicle-status': vehicleStatusTemplate,
  'payee-certification': payeeCertificationTemplate,
  'campaign-opportunity': campaignOpportunityTemplate,
  'campaign-payment-reminder': campaignPaymentReminderTemplate,
  'campaign-expired-notice': campaignExpiredNoticeTemplate,
  'installation-overdue': installationOverdueTemplate,
  'gps-inactivity-alert': gpsInactivityAlertTemplate,
  'enterprise-lead-notify': enterpriseLeadNotifyTemplate,
  'enterprise-lead-confirm': enterpriseLeadConfirmTemplate,
  'brief-created': briefCreatedTemplate,
  'brief-campaign-confirmed': briefCampaignConfirmedTemplate,
}

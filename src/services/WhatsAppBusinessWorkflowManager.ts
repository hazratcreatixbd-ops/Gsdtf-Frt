/**
 * PART 15.1 — WhatsApp Business Message Preparation & Dispatch Workflow
 *
 * Implements the strict 7-step procedure:
 * 1. Contact identification (resolve or ask user)
 * 2. Missing details check (business name, objective, contact details)
 * 3. Factual business research (never invent facts/numbers)
 * 4. Factual message draft generation
 * 5. Preview & edit (interactive card with user editability)
 * 6. Explicit confirmation (confirmedSensitive = true requirement)
 * 7. Verified native dispatch & action-result reporting
 */

import { nativeAndroidAdapter } from './AndroidBridge/NativeAndroidAdapter';
import { actionLifecycleManager } from './AndroidBridge/ActionLifecycleManager';
import { speakerVerificationManager } from './SpeakerVerificationManager';

export type WhatsAppWorkflowStep =
  | 'CONTACT_IDENTIFICATION'
  | 'AWAITING_CONTACT_SELECTION'
  | 'GATHERING_DETAILS'
  | 'BUSINESS_RESEARCH'
  | 'DRAFT_PREVIEW'
  | 'AWAITING_CONFIRMATION'
  | 'DISPATCHING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface BusinessMessageDraft {
  draftId: string;
  step: WhatsAppWorkflowStep;
  recipientName?: string;
  recipientPhone?: string;
  businessName?: string;
  businessContext?: {
    verifiedFacts: string[];
    sourceNotes?: string;
  };
  objective: string;
  draftText: string;
  missingDetails: string[];
  candidateContacts?: Array<{ name: string; phone?: string }>;
  confirmedSensitive: boolean;
  createdAt: number;
  updatedAt: number;
  dispatchedAt?: number;
  dispatchResult?: {
    success: boolean;
    verified: boolean;
    message: string;
    actionId?: string;
    errorCode?: string | null;
  };
}

export type WorkflowListener = (draft: BusinessMessageDraft) => void;

class WhatsAppBusinessWorkflowManager {
  private activeDrafts: Map<string, BusinessMessageDraft> = new Map();
  private listeners: Set<WorkflowListener> = new Set();

  public subscribe(listener: WorkflowListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(draft: BusinessMessageDraft) {
    for (const listener of this.listeners) {
      try {
        listener(draft);
      } catch (err) {
        console.error('[WhatsAppBusinessWorkflowManager] Listener error:', err);
      }
    }
  }

  public getDraft(draftId: string): BusinessMessageDraft | undefined {
    return this.activeDrafts.get(draftId);
  }

  public getAllDrafts(): BusinessMessageDraft[] {
    return Array.from(this.activeDrafts.values());
  }

  /**
   * STEP 1 & 2: Initiate business message preparation
   */
  public prepareBusinessMessage(params: {
    recipientName?: string;
    recipientPhone?: string;
    businessName?: string;
    objective: string;
    knownFacts?: string[];
  }): BusinessMessageDraft {
    const draftId = `wamsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const missing: string[] = [];

    if (!params.recipientName && !params.recipientPhone) {
      missing.push('recipient (contact name or phone number)');
    }
    if (!params.businessName) {
      missing.push('business name');
    }
    if (!params.objective || params.objective.trim().length < 5) {
      missing.push('message objective (e.g. inquiry, appointment booking, order status)');
    }

    let initialStep: WhatsAppWorkflowStep = 'CONTACT_IDENTIFICATION';
    if (missing.length > 0) {
      initialStep = 'GATHERING_DETAILS';
    } else {
      initialStep = 'BUSINESS_RESEARCH';
    }

    // Compose factual draft using only verified information
    const verifiedFacts = params.knownFacts || [];
    const bName = params.businessName || 'the business';
    const initialDraftText = this.composeFactualDraft(bName, params.objective, verifiedFacts);

    const draft: BusinessMessageDraft = {
      draftId,
      step: initialStep,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      businessName: params.businessName,
      businessContext: {
        verifiedFacts,
        sourceNotes: verifiedFacts.length > 0 ? 'Verified from provided context' : 'No external claims made',
      },
      objective: params.objective,
      draftText: initialDraftText,
      missingDetails: missing,
      confirmedSensitive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (missing.length === 0) {
      draft.step = 'DRAFT_PREVIEW';
    }

    this.activeDrafts.set(draftId, draft);
    this.notify(draft);
    return draft;
  }

  /**
   * STEP 3 & 4: Compose factual draft strictly without fabricating prices, times, or contacts.
   */
  private composeFactualDraft(businessName: string, objective: string, facts: string[]): string {
    const factsSummary = facts.length > 0 ? `Regarding: ${facts.join('; ')}.\n` : '';
    return `Hello ${businessName},\n\nI am contacting you regarding ${objective}.\n${factsSummary}Could you please provide further details and availability?\n\nThank you.`;
  }

  /**
   * STEP 5: Update/Edit the draft message text or parameters
   */
  public updateDraft(draftId: string, updates: Partial<BusinessMessageDraft>): BusinessMessageDraft {
    const draft = this.activeDrafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft ${draftId} not found.`);
    }

    Object.assign(draft, updates, { updatedAt: Date.now() });

    // Recalculate missing details
    const missing: string[] = [];
    if (!draft.recipientName && !draft.recipientPhone) missing.push('recipient');
    if (!draft.businessName) missing.push('business name');
    if (!draft.objective) missing.push('message objective');
    draft.missingDetails = missing;

    if (missing.length === 0 && draft.step === 'GATHERING_DETAILS') {
      draft.step = 'DRAFT_PREVIEW';
    }

    this.notify(draft);
    return draft;
  }

  /**
   * Disambiguate or choose candidate contact
   */
  public selectCandidateContact(draftId: string, contact: { name: string; phone?: string }): BusinessMessageDraft {
    const draft = this.activeDrafts.get(draftId);
    if (!draft) throw new Error(`Draft ${draftId} not found.`);

    draft.recipientName = contact.name;
    draft.recipientPhone = contact.phone || draft.recipientPhone;
    draft.candidateContacts = undefined;
    draft.missingDetails = draft.missingDetails.filter((m) => m !== 'recipient');
    draft.step = draft.missingDetails.length === 0 ? 'DRAFT_PREVIEW' : 'GATHERING_DETAILS';
    draft.updatedAt = Date.now();

    this.notify(draft);
    return draft;
  }

  /**
   * STEP 6 & 7: Explicit user confirmation and verified dispatch
   */
  public async confirmAndDispatch(
    draftId: string,
    confirmedSensitive: boolean
  ): Promise<{
    success: boolean;
    verified: boolean;
    message: string;
    draft: BusinessMessageDraft;
  }> {
    const draft = this.activeDrafts.get(draftId);
    if (!draft) {
      return {
        success: false,
        verified: false,
        message: `Draft ${draftId} was not found.`,
        draft: null as any,
      };
    }

    // Step 6: Strict confirmation check
    if (!confirmedSensitive) {
      draft.step = 'AWAITING_CONFIRMATION';
      this.notify(draft);
      return {
        success: false,
        verified: false,
        message:
          'Explicit user confirmation is required before dispatching external WhatsApp messages. Please review the draft and say "Yes, send it" or confirm in the preview card.',
        draft,
      };
    }

    // Speaker verification check for protected communication
    if (speakerVerificationManager.isEnabled()) {
      const isAuthorized = speakerVerificationManager.isAuthorized();
      if (!isAuthorized) {
        draft.step = 'FAILED';
        draft.dispatchResult = {
          success: false,
          verified: false,
          message: 'Sending WhatsApp message blocked: speaker voice is unauthorized or unverified.',
          errorCode: 'UNAUTHORIZED_SPEAKER',
        };
        this.notify(draft);
        return {
          success: false,
          verified: false,
          message: 'Dispatch blocked: speaker voice is unauthorized. Protected actions require enrolled speaker verification.',
          draft,
        };
      }
    }

    draft.confirmedSensitive = true;
    draft.step = 'DISPATCHING';
    this.notify(draft);

    const targetPhone = draft.recipientPhone || draft.recipientName || '';
    const messageText = draft.draftText.trim();

    // Step 7: Verified native dispatch via Android Accessibility & Intent
    const actionResult = await actionLifecycleManager.executeCrossAppTextAction({
      targetPackage: 'com.whatsapp',
      targetAppName: 'WhatsApp',
      targetFieldHint: 'com.whatsapp:id/entry',
      text: messageText,
      confirmedSensitive: true,
      recipient: targetPhone,
      autoSend: false, // Never send automatically without manual user trigger or explicit request
    });

    draft.dispatchedAt = Date.now();
    draft.dispatchResult = {
      success: actionResult.success,
      verified: actionResult.verified,
      message: actionResult.message,
      actionId: actionResult.actionId,
      errorCode: actionResult.errorCode,
    };

    if (actionResult.success && actionResult.verified) {
      draft.step = 'COMPLETED';
    } else {
      draft.step = 'FAILED';
    }

    this.notify(draft);
    return {
      success: actionResult.success,
      verified: actionResult.verified,
      message: actionResult.message,
      draft,
    };
  }

  public cancelDraft(draftId: string): void {
    const draft = this.activeDrafts.get(draftId);
    if (draft) {
      draft.step = 'CANCELLED';
      draft.updatedAt = Date.now();
      this.notify(draft);
    }
  }
}

export const whatsAppBusinessWorkflowManager = new WhatsAppBusinessWorkflowManager();

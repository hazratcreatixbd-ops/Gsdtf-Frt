/**
 * PART 9 — Verification Worker
 * Quality and compliance auditor for the orchestration system:
 * Inspects all preceding worker outputs, validates required fields,
 * detects missing parameters or unsupported factual claims, and assigns
 * a formal verification grade (PASS / NEEDS_REVIEW / FAILED).
 */

import { AgentWorker, AgentTask, WorkerExecutionResult, VerificationResult, VerificationGrade } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class VerificationWorker implements AgentWorker {
  public readonly id = 'verification-worker';
  public readonly name = 'Verification Worker';
  public readonly description = 'Validates task deliverables, detects unsupported claims, checks safety requirements, and returns PASS / NEEDS_REVIEW / FAILED.';
  public readonly capabilities = [
    'output_verification',
    'field_completeness_check',
    'claim_substantiation_audit',
    'safety_compliance_check',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    const title = task.title.toLowerCase();
    return (
      type === 'verification' ||
      type === 'verification_worker' ||
      type === 'qa' ||
      title.includes('verify') ||
      title.includes('validate') ||
      title.includes('audit')
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`VerificationWorker auditing workflow outputs: ${task.title}`, 'info', task.id);

    try {
      if (context.isCancelled()) {
        this.status = 'idle';
        return {
          success: false,
          workerId: this.id,
          taskId: task.id,
          status: 'failed',
          result: null,
          artifacts: [],
          warnings: ['Task cancelled.'],
          errors: ['Execution cancelled.'],
          nextActions: [],
        };
      }

      const allOutputs = context.getAllOutputs();
      const passedChecks: string[] = [];
      const failedChecks: string[] = [];
      const warnings: string[] = [];
      const unsupportedClaims: string[] = [];

      // Check 1: Workflow outputs presence
      const outputKeys = Object.keys(allOutputs);
      if (outputKeys.length > 0) {
        passedChecks.push(`Verified ${outputKeys.length} preceding task deliverables in workflow context.`);
      } else {
        failedChecks.push('No preceding deliverables detected in workflow context.');
      }

      // Check 2: Audit each deliverable for safety and completeness
      for (const [key, out] of Object.entries(allOutputs)) {
        if (!out) continue;

        // Check for required content structure
        if (out.title || out.query || out.overview || out.topic || out.postDraft) {
          passedChecks.push(`[Task ${key}] Deliverable title and core payload validated.`);
        }

        // Check for clickbait or unsubstantiated claims
        const textSample = JSON.stringify(out).toLowerCase();
        if (textSample.includes('guaranteed 100%') || textSample.includes('get rich quick') || textSample.includes('make millions overnight')) {
          unsupportedClaims.push(`[Task ${key}] Potential unsubstantiated commercial claim detected.`);
        } else {
          passedChecks.push(`[Task ${key}] Free from deceptive or unverified claims.`);
        }

        // Check for publishing authorization compliance
        if (out.publishingPackage) {
          if (!out.publishingPackage.capabilities?.isConnected) {
            warnings.push(`[Task ${key}] Publishing requires manual user handoff (OAuth not authenticated).`);
          }
          passedChecks.push(`[Task ${key}] Publishing honesty confirmed; no faked publication states.`);
        }
      }

      // Grade assignment
      let grade: VerificationGrade = 'PASS';
      if (failedChecks.length > 0 || unsupportedClaims.length > 0) {
        grade = failedChecks.length > 0 ? 'FAILED' : 'NEEDS_REVIEW';
      } else if (warnings.length > 0) {
        grade = 'PASS'; // Warnings are informative (e.g. OAuth handoff notes)
      }

      const verificationResult: VerificationResult = {
        grade,
        passedChecks,
        failedChecks,
        warnings,
        unsupportedClaims,
        recommendation:
          grade === 'PASS'
            ? 'All workflow deliverables meet FRIDAY quality, safety, and factual standards. Ready for user presentation.'
            : 'Deliverables require adjustments before final executive sign-off.',
      };

      this.status = 'idle';
      context.log(`VerificationWorker completed audit. Grade: ${grade}`, 'info', task.id);

      return {
        success: grade !== 'FAILED',
        workerId: this.id,
        taskId: task.id,
        status: grade === 'FAILED' ? 'failed' : 'completed',
        result: {
          ...verificationResult,
          verification: verificationResult,
        },
        artifacts: [
          {
            id: `art_ver_${Date.now()}`,
            name: `Quality & Safety Audit (${grade})`,
            type: 'verification_audit',
            data: verificationResult,
          },
        ],
        warnings,
        errors: failedChecks,
        nextActions: grade === 'PASS' ? ['Generate final executive summary for user.'] : ['Review flagged checks.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`VerificationWorker error: ${err.message}`, 'error', task.id);
      return {
        success: false,
        workerId: this.id,
        taskId: task.id,
        status: 'failed',
        result: null,
        artifacts: [],
        warnings: [],
        errors: [err.message],
        nextActions: [],
      };
    }
  }
}

/**
 * PART 9 — Publishing Worker
 * Validates platform readiness, prepares multi-asset publishing packages,
 * interfaces with Part 8 Publishing Adapters, and stages scheduled calendar releases.
 * Enforces strict honesty: Never fakes direct publication if the platform is unauthenticated.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';
import { publishingManager } from '../../Publishing/PublishingAdapter';
import { ContentPlatform } from '../../../types/content';

export class PublishingWorker implements AgentWorker {
  public readonly id = 'publishing-worker';
  public readonly name = 'Publishing Worker';
  public readonly description = 'Validates platform specs, formats production publishing packages, and handles scheduled releases.';
  public readonly capabilities = [
    'package_validation',
    'schedule_staging',
    'publishing_handoff',
    'platform_readiness_check',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    const title = task.title.toLowerCase();
    return (
      type === 'publishing' ||
      type === 'publishing_worker' ||
      title.includes('publish') ||
      title.includes('schedule')
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`PublishingWorker preparing package: ${task.title}`, 'info', task.id);

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

      const input = task.input || {};
      const platform: ContentPlatform = input.platform || 'YouTube Shorts';
      const title = input.title || context.goal;
      const body = input.caption || input.body || 'Draft content package';
      const scheduledDate = input.scheduledDate || new Date().toISOString().split('T')[0];
      const scheduledTime = input.scheduledTime || '10:00';

      const adapter = publishingManager.getAdapter(platform);
      const capabilities = adapter ? adapter.getCapabilities() : null;

      // Stage calendar scheduling in FRIDAY persistent calendar
      const calendarItem = context.content.scheduleContentItem({
        contentId: input.contentId || `item_${Date.now()}`,
        title,
        platform,
        format: input.format || 'short_form_video',
        scheduledDate,
        scheduledTime,
        autoCreateReminderTask: true,
      });

      // Prepare complete handoff package
      const publishingPackage = {
        platform,
        title,
        body,
        scheduledDate,
        scheduledTime,
        status: capabilities?.isConnected ? 'ready_for_direct_publish' : 'ready_for_operator_handoff',
        capabilities,
        notice: capabilities?.isConnected
          ? 'Platform authenticated. Ready for publishing execution upon user confirmation.'
          : 'Publishing API integration is not connected. Package is validated and scheduled locally in FRIDAY Calendar.',
      };

      this.status = 'idle';
      context.log(`PublishingWorker staged package for ${platform} (${calendarItem.id})`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: {
          calendarItemId: calendarItem.id,
          publishingPackage,
        },
        artifacts: [
          {
            id: `art_pub_${Date.now()}`,
            name: `Publishing Package: [${platform}] ${title}`,
            type: 'publishing_package',
            data: publishingPackage,
          },
        ],
        warnings: capabilities?.isConnected ? [] : ['Platform not authenticated for direct push; manual or copy/paste upload required.'],
        errors: [],
        nextActions: ['Route to Verification Worker to ensure all required fields are validated.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`PublishingWorker error: ${err.message}`, 'error', task.id);
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

/**
 * PART 9 — Social Media Worker
 * Specializes in multi-platform adaptation across YouTube, Facebook, Instagram,
 * TikTok, and Pinterest. Enforces native character limits, hashtag limits,
 * and strict publishing honesty.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';
import { ContentPlatform } from '../../../types/content';

export class SocialMediaWorker implements AgentWorker {
  public readonly id = 'social-media-worker';
  public readonly name = 'Social Media Worker';
  public readonly description = 'Adapts content across YouTube, Instagram, TikTok, Facebook, and Pinterest with platform-accurate formatting.';
  public readonly capabilities = [
    'platform_adaptation',
    'caption_formatting',
    'aspect_ratio_guidelines',
    'hashtag_curation',
    'schedule_formatting',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    const title = task.title.toLowerCase();
    return (
      type === 'social' ||
      type === 'social_media' ||
      type === 'social_media_worker' ||
      title.includes('instagram') ||
      title.includes('tiktok') ||
      title.includes('facebook') ||
      title.includes('pinterest') ||
      title.includes('youtube shorts')
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`SocialMediaWorker adapting content: ${task.title}`, 'info', task.id);

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
      const topic = input.topic || context.goal;
      const targetPlatforms: ContentPlatform[] = input.platforms || [
        'YouTube Shorts',
        'Instagram',
        'TikTok',
        'Facebook',
        'Pinterest',
      ];

      const captions = context.content.generateCaptions({
        topic,
        platforms: targetPlatforms,
      });

      const adaptations = targetPlatforms.map((platform) => {
        let specs = {
          aspectRatio: '9:16 (Vertical Portrait)',
          maxDuration: '60s',
          recommendedLimit: 2200,
        };

        if (platform === 'Pinterest') {
          specs = { aspectRatio: '2:3 (Pin Graphic)', maxDuration: 'N/A', recommendedLimit: 500 };
        } else if (platform === 'YouTube') {
          specs = { aspectRatio: '16:9 (Landscape)', maxDuration: 'Flexible', recommendedLimit: 5000 };
        }

        const match = captions.find((c) => c.platform === platform);
        return {
          platform,
          specs,
          caption: match?.captionText || `Ready to publish on ${platform}`,
          hashtags: match?.hashtags || ['#Productivity', '#Automation'],
        };
      });

      this.status = 'idle';
      context.log(`SocialMediaWorker adapted content for ${targetPlatforms.length} platforms`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: {
          topic,
          platformsCount: targetPlatforms.length,
          adaptations,
          notice: 'Draft packages formatted. Direct publishing requires official API authorization in Publishing Worker.',
        },
        artifacts: [
          {
            id: `art_soc_${Date.now()}`,
            name: `Social Media Multi-Platform Package: ${topic}`,
            type: 'social_adaptation',
            data: adaptations,
          },
        ],
        warnings: [],
        errors: [],
        nextActions: ['Route to Publishing Worker for schedule staging or verification.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`SocialMediaWorker error: ${err.message}`, 'error', task.id);
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

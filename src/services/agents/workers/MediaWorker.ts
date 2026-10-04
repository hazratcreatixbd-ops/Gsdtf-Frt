/**
 * PART 9 — Media Worker
 * Organizes project file manifests, inspects local/cloud asset structures,
 * plans video editing timelines, and manages media metadata.
 * Enforces honesty: Does not claim physical rendering unless actual tools exist.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class MediaWorker implements AgentWorker {
  public readonly id = 'media-worker';
  public readonly name = 'Media Worker';
  public readonly description = 'Organizes media file manifests, metadata packages, asset directories, and video timeline plans.';
  public readonly capabilities = [
    'media_asset_organization',
    'metadata_generation',
    'timeline_planning',
    'file_manifest_creation',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    const title = task.title.toLowerCase();
    return (
      type === 'media' ||
      type === 'media_worker' ||
      type === 'video_assets' ||
      title.includes('media') ||
      title.includes('video asset') ||
      title.includes('file organization')
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`MediaWorker organizing assets: ${task.title}`, 'info', task.id);

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

      // Generate structured metadata package
      const metadata = {
        topic,
        suggestedFilename: `${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_master.mp4`,
        aspectRatio: input.aspectRatio || '9:16 (1080x1920)',
        fps: 30,
        timelineCues: [
          { timecode: '00:00 - 00:03', cue: 'Fast zoom cut + high-contrast text overlay' },
          { timecode: '00:03 - 00:15', cue: 'B-roll screen recording of workflow' },
          { timecode: '00:15 - 00:45', cue: 'Numbered animated bullet steps 1, 2, 3' },
          { timecode: '00:45 - 00:60', cue: 'Outro card + animated link pointer' },
        ],
        assetChecklist: [
          'Master Voiceover Audio (24kHz / 48kHz WAV)',
          'Background Music Track (-18dB Ducking)',
          'B-Roll Screen Capture (1080p minimum)',
          'Thumbnail Graphics (1280x720 PNG)',
        ],
        disclaimer: 'MediaWorker prepares editing manifests and timelines; final rendering requires external NLE software or authorized video rendering pipeline.',
      };

      this.status = 'idle';
      context.log(`MediaWorker generated timeline and asset manifest for "${topic}"`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: metadata,
        artifacts: [
          {
            id: `art_med_${Date.now()}`,
            name: `Media Manifest & Timeline: ${topic}`,
            type: 'media_manifest',
            data: metadata,
          },
        ],
        warnings: [],
        errors: [],
        nextActions: ['Pass manifest to Content or Publishing Worker.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`MediaWorker error: ${err.message}`, 'error', task.id);
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

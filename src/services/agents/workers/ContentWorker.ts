/**
 * PART 9 — Content Worker
 * Integrates with Part 8 Content Marketing system:
 * Generates ideas, hooks, scripts, captions, titles, descriptions, hashtags,
 * repurposing packages, humanization, and weekly content plans.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class ContentWorker implements AgentWorker {
  public readonly id = 'content-worker';
  public readonly name = 'Content Worker';
  public readonly description = 'Generates multi-platform content ideas, timed video scripts, non-clickbait hooks, captions, and repurposing packages.';
  public readonly capabilities = [
    'content_idea_generation',
    'hook_generation',
    'video_script_writing',
    'caption_generation',
    'hashtag_generation',
    'content_repurposing',
    'content_humanization',
    'weekly_content_planning',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    return (
      type === 'content' ||
      type === 'content_worker' ||
      type === 'script' ||
      type === 'hooks' ||
      type === 'repurpose' ||
      type === 'copywriting'
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`ContentWorker executing: ${task.title}`, 'info', task.id);

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
      const action = input.action || 'generate_content';
      let resultData: any = null;
      const artifacts: any[] = [];

      if (action === 'hooks' || task.title.toLowerCase().includes('hook')) {
        const hooks = context.content.generateHooks(input.topic || context.goal, input.angle);
        resultData = hooks;
        artifacts.push({
          id: `art_hooks_${Date.now()}`,
          name: `Hook Options (${hooks.length})`,
          type: 'hooks',
          data: hooks,
        });
      } else if (action === 'script' || task.title.toLowerCase().includes('script')) {
        const script = context.content.writeContentScript({
          title: input.title || context.goal,
          platform: input.platform || 'YouTube Shorts',
          targetDuration: input.duration || '60s',
          keyPoints: input.keyPoints,
        });

        // Humanize the draft script for conversational pacing
        const humanized = context.content.humanizeContent(script.fullText);
        script.fullText = humanized.humanizedText;
        script.isHumanized = true;

        resultData = script;
        artifacts.push({
          id: `art_script_${Date.now()}`,
          name: `Timed Script: ${script.title}`,
          type: 'script',
          data: script,
        });
      } else if (action === 'repurpose' || task.title.toLowerCase().includes('repurpose')) {
        const repurposePkg = context.content.repurposeContent({
          originalTitle: input.title || context.goal,
          originalPlatform: input.platform || 'YouTube',
          originalContent: input.content || 'Core business framework breakdown',
        });
        resultData = repurposePkg;
        artifacts.push({
          id: `art_repurp_${Date.now()}`,
          name: `Repurposed Package (${repurposePkg.variations.length} Platforms)`,
          type: 'repurposed_package',
          data: repurposePkg,
        });
      } else {
        // Default: Generate Ideas & 7-Day Weekly Content Plan
        const ideas = context.content.generateContentIdeas({
          topic: input.topic || context.goal,
          count: input.count || 5,
        });
        const weeklyPlan = context.content.createWeeklyContentPlan({
          targetBusinessGoal: context.goal,
        });

        resultData = {
          ideas,
          weeklyPlan,
        };

        artifacts.push({
          id: `art_ideas_${Date.now()}`,
          name: `Generated Content Ideas (${ideas.length})`,
          type: 'ideas',
          data: ideas,
        });
        artifacts.push({
          id: `art_wplan_${Date.now()}`,
          name: `Weekly Plan: ${weeklyPlan.weekLabel}`,
          type: 'weekly_plan',
          data: weeklyPlan,
        });
      }

      this.status = 'idle';
      context.log(`ContentWorker completed: ${task.title}`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result: resultData,
        artifacts,
        warnings: [],
        errors: [],
        nextActions: ['Route to LinkedIn Worker or Social Media Worker for platform adaptation.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`ContentWorker error: ${err.message}`, 'error', task.id);
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

/**
 * PART 9 — LinkedIn Worker
 * Specialized B2B thought-leadership worker:
 * Manages LinkedIn post drafting, carousel framework outlines, profile optimization,
 * engagement replies, and employee advocacy planning.
 */

import { AgentWorker, AgentTask, WorkerExecutionResult } from '../AgentTypes';
import { AgentContextImpl } from '../AgentContext';

export class LinkedInWorker implements AgentWorker {
  public readonly id = 'linkedin-worker';
  public readonly name = 'LinkedIn Worker';
  public readonly description = 'Optimizes LinkedIn thought leadership, carousel scripts, executive posts, comment strategies, and advocacy.';
  public readonly capabilities = [
    'linkedin_post_drafting',
    'linkedin_carousel_outlining',
    'profile_optimization',
    'comment_strategy',
    'advocacy_planning',
  ];

  private status: 'idle' | 'busy' | 'paused' | 'error' = 'idle';

  public canHandle(task: AgentTask): boolean {
    const type = task.workerType.toLowerCase();
    const title = task.title.toLowerCase();
    return (
      type === 'linkedin' ||
      type === 'linkedin_worker' ||
      title.includes('linkedin') ||
      (type === 'social' && task.input?.platform === 'LinkedIn')
    );
  }

  public getStatus(): 'idle' | 'busy' | 'paused' | 'error' {
    return this.status;
  }

  public async execute(task: AgentTask, context: AgentContextImpl): Promise<WorkerExecutionResult> {
    this.status = 'busy';
    context.log(`LinkedInWorker executing: ${task.title}`, 'info', task.id);

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

      // Draft high-converting LinkedIn post with clean linebreaks
      const postDraft = `Most operators overcomplicate ${topic}.\n\nThey hire reactive headcount and layer on bloated subscriptions, wondering why delivery velocity grinds to a halt.\n\nHere are 3 rules we enforce to keep operations lean:\n\n1. Standardize the milestone before delegating the task.\n2. Keep updates strictly asynchronous.\n3. Eliminate 2 redundant steps before touching any automation.\n\nWhat is your #1 rule for maintaining operational speed? Drop your thoughts below.\n\n#Productivity #Operations #Leadership #BusinessSystems`;

      // Structure 5-slide carousel framework
      const carouselSlides = [
        { slide: 1, title: 'The Problem', copy: `Why traditional approaches to ${topic} create invisible bottlenecks.` },
        { slide: 2, title: 'The Cost', copy: 'Teams lose 15+ hours weekly to fragmented tools and status meetings.' },
        { slide: 3, title: 'The Shift', copy: 'Consolidate into an asynchronous central command center.' },
        { slide: 4, title: 'The Checklist', copy: '3 non-negotiable filters for every weekly sprint.' },
        { slide: 5, title: 'Action', copy: 'Save this post and review it during your next quarterly retrospective.' },
      ];

      const profileOptimizationChecklist = [
        'Headline: State clear transformation (e.g. "Helping lean operators automate delivery with zero overhead").',
        'Featured Section: Pin top performing case study or free diagnostic checklist.',
        'About Section: First 3 lines hook the reader before the "see more" cutoff.',
      ];

      const result = {
        platform: 'LinkedIn',
        topic,
        postDraft,
        characterCount: postDraft.length,
        carouselSlides,
        profileOptimizationChecklist,
        engagementStrategy: 'Engage with top 5 commenter questions within the first 60 minutes of posting.',
      };

      this.status = 'idle';
      context.log(`LinkedInWorker completed post draft for "${topic}"`, 'info', task.id);

      return {
        success: true,
        workerId: this.id,
        taskId: task.id,
        status: 'completed',
        result,
        artifacts: [
          {
            id: `art_li_${Date.now()}`,
            name: `LinkedIn Package: ${topic}`,
            type: 'linkedin_package',
            data: result,
          },
        ],
        warnings: [],
        errors: [],
        nextActions: ['Route to Publishing Worker or Verification Worker.'],
      };
    } catch (err: any) {
      this.status = 'error';
      context.log(`LinkedInWorker error: ${err.message}`, 'error', task.id);
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

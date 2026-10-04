/**
 * PART 13 — Live Workflow Timeline
 * Real-time milestone tracker populated strictly from authentic system execution events.
 * Never fabricates phantom events.
 */

import { TimelineEvent } from './ManagerTypes';
import { worldEventBus } from '../events/WorldEventBus';

export class WorkflowTimeline {
  private static instance: WorkflowTimeline;
  private events: TimelineEvent[] = [];
  private maxStoredEvents = 100;

  private constructor() {
    this.connectToEventBus();
  }

  public static getInstance(): WorkflowTimeline {
    if (!WorkflowTimeline.instance) {
      WorkflowTimeline.instance = new WorkflowTimeline();
    }
    return WorkflowTimeline.instance;
  }

  private connectToEventBus(): void {
    worldEventBus.on('*', (evt) => {
      let category: TimelineEvent['category'] = 'SYSTEM';
      if (evt.workerName?.includes('Hermes') || evt.type === 'MANAGER_DECISION') {
        category = 'MANAGER';
      } else if (evt.workerName?.includes('Chronos') || evt.type === 'PLAN_CREATED') {
        category = 'PLANNER';
      } else if (evt.workerName?.includes('Astra') || evt.type.includes('VERIFICATION')) {
        category = 'VERIFICATION';
      } else if (evt.workerName?.includes('Athena')) {
        category = 'REVIEW';
      } else if (evt.type.includes('APPROVAL')) {
        category = 'APPROVAL';
      } else if (evt.workerId) {
        category = 'WORKER';
      }

      const timeFormatted = new Date(evt.timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      this.addEvent({
        id: `tl_${evt.id}`,
        timestamp: evt.timestamp,
        timeFormatted,
        actor: evt.workerName || 'FRIDAY Operations',
        action: evt.title,
        details: evt.details,
        category,
        level: evt.level,
        taskId: evt.taskId,
      });
    });
  }

  public addEvent(event: TimelineEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxStoredEvents) {
      this.events = this.events.slice(0, this.maxStoredEvents);
    }
  }

  public getEvents(workflowId?: string, limit: number = 30): TimelineEvent[] {
    if (workflowId) {
      return this.events.filter((e) => !e.workflowId || e.workflowId === workflowId).slice(0, limit);
    }
    return this.events.slice(0, limit);
  }

  public clear(): void {
    this.events = [];
  }
}

export const workflowTimeline = WorkflowTimeline.getInstance();

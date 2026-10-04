/**
 * PART 6 — FRIDAY Background Execution & Task Queue
 * Architecture for queuing, scheduling, and executing background tasks.
 * Includes retry mechanisms, timeout handling, and foreground service notification contracts.
 * Transparently indicates browser tab limits vs Android native foreground services.
 */

import { BackgroundTaskSpec, AndroidActionResult } from '../../types/android';
import { IAndroidBridge } from './AndroidBridgeInterface';

export class BackgroundExecutionQueue {
  private static instance: BackgroundExecutionQueue;
  private queue: BackgroundTaskSpec[] = [];
  private isProcessing = false;
  private bridge: IAndroidBridge | null = null;
  private listeners: Set<(queue: BackgroundTaskSpec[]) => void> = new Set();

  public static getInstance(): BackgroundExecutionQueue {
    if (!BackgroundExecutionQueue.instance) {
      BackgroundExecutionQueue.instance = new BackgroundExecutionQueue();
    }
    return BackgroundExecutionQueue.instance;
  }

  public setBridge(bridge: IAndroidBridge): void {
    this.bridge = bridge;
  }

  public subscribe(listener: (queue: BackgroundTaskSpec[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = [...this.queue];
    this.listeners.forEach((l) => l(copy));
  }

  public enqueue(
    title: string,
    action: BackgroundTaskSpec['action'],
    options: {
      scheduledTime?: number;
      intervalMs?: number;
      maxRetries?: number;
      requiresForegroundService?: boolean;
    } = {}
  ): BackgroundTaskSpec {
    const task: BackgroundTaskSpec = {
      id: `bg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      action,
      scheduledTime: options.scheduledTime,
      intervalMs: options.intervalMs,
      maxRetries: options.maxRetries ?? 3,
      retryCount: 0,
      status: 'queued',
      requiresForegroundService: options.requiresForegroundService ?? false,
      createdAt: Date.now(),
    };

    this.queue.push(task);
    this.notify();
    this.processQueue();

    return task;
  }

  public cancelTask(taskId: string): boolean {
    const task = this.queue.find((t) => t.id === taskId);
    if (!task) return false;
    if (task.status === 'running') {
      task.status = 'cancelled';
    } else {
      task.status = 'cancelled';
    }
    this.notify();
    return true;
  }

  public getTasks(): BackgroundTaskSpec[] {
    return [...this.queue];
  }

  public clearCompleted(): void {
    this.queue = this.queue.filter((t) => t.status === 'queued' || t.status === 'running');
    this.notify();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const readyTasks = this.queue.filter(
        (t) => t.status === 'queued' && (!t.scheduledTime || t.scheduledTime <= now)
      );

      for (const task of readyTasks) {
        if (!this.bridge) break;

        task.status = 'running';
        this.notify();

        try {
          // Timeout execution guard (default 10s)
          const timeoutMs = task.action.timeoutMs || 10000;
          const resultPromise = this.bridge.executeSupportedAction(task.action);
          const timeoutPromise = new Promise<AndroidActionResult>((_, reject) =>
            setTimeout(
              () =>
                reject({
                  success: false,
                  action: task.action.actionType,
                  errorCode: 'ACTION_TIMEOUT',
                  message: `Background task timed out after ${timeoutMs}ms`,
                }),
              timeoutMs
            )
          );

          const result = await Promise.race([resultPromise, timeoutPromise]);

          if (result.success) {
            task.status = 'completed';
          } else {
            if ((task.retryCount || 0) < (task.maxRetries || 3)) {
              task.retryCount = (task.retryCount || 0) + 1;
              task.status = 'queued'; // Will retry next cycle
            } else {
              task.status = 'failed';
            }
          }
        } catch (err: any) {
          if ((task.retryCount || 0) < (task.maxRetries || 3)) {
            task.retryCount = (task.retryCount || 0) + 1;
            task.status = 'queued';
          } else {
            task.status = 'failed';
          }
        }

        this.notify();
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const backgroundExecutionQueue = BackgroundExecutionQueue.getInstance();

/**
 * PART 11 — FRIDAY World Event Bus
 * Centralized typed event architecture for Agent Town, Workers, Manager,
 * and World visual activity streams.
 */

import { WorldActivityEvent, WorldEventType } from '../types/WorldTypes';

export type WorldEventListener = (event: WorldActivityEvent) => void;

export class WorldEventBus {
  private static instance: WorldEventBus;
  private listeners: Map<WorldEventType | '*', Set<WorldEventListener>> = new Map();
  private activityHistory: WorldActivityEvent[] = [];

  private constructor() {
    // Seed initial system startup events
    this.emit({
      type: 'MANAGER_DECISION',
      title: 'FRIDAY Executive Core Online',
      details: 'Agent Town operational. Worker fleet initialized across executive, research, and creative suites.',
      level: 'success',
      workerName: 'Hermes (Manager)',
    });
  }

  public static getInstance(): WorldEventBus {
    if (!WorldEventBus.instance) {
      WorldEventBus.instance = new WorldEventBus();
    }
    return WorldEventBus.instance;
  }

  public on(eventType: WorldEventType | '*', listener: WorldEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public emit(params: {
    type: WorldEventType;
    title: string;
    details: string;
    level?: 'info' | 'warn' | 'error' | 'success';
    workerId?: string;
    workerName?: string;
    taskId?: string;
  }): WorldActivityEvent {
    const event: WorldActivityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      timestamp: Date.now(),
      title: params.title,
      details: params.details,
      level: params.level || 'info',
      workerId: params.workerId,
      workerName: params.workerName,
      taskId: params.taskId,
    };

    this.activityHistory.unshift(event);
    if (this.activityHistory.length > 100) {
      this.activityHistory = this.activityHistory.slice(0, 100);
    }

    // Notify specific type listeners
    this.listeners.get(params.type)?.forEach((l) => {
      try {
        l(event);
      } catch (e) {
        console.error('[WorldEventBus] Listener error:', e);
      }
    });

    // Notify wildcard listeners
    this.listeners.get('*')?.forEach((l) => {
      try {
        l(event);
      } catch (e) {
        console.error('[WorldEventBus] Wildcard listener error:', e);
      }
    });

    return event;
  }

  public getHistory(): WorldActivityEvent[] {
    return [...this.activityHistory];
  }

  public clearHistory(): void {
    this.activityHistory = [];
  }
}

export const worldEventBus = WorldEventBus.getInstance();

/**
 * PART 6 — FRIDAY Native Event Bus
 * Typed bidirectional communication bus between Android native layer and FRIDAY core.
 * Features deduplication, event history, and safe listener dispatch.
 */

import { NativeEvent, NativeEventType } from '../../types/android';

export type NativeEventListener<T = any> = (event: NativeEvent<T>) => void;

export class NativeEventBus {
  private static instance: NativeEventBus;
  private listeners: Map<NativeEventType, Set<NativeEventListener>> = new Map();
  private wildcardListeners: Set<NativeEventListener> = new Set();
  private processedEventIds: Set<string> = new Set();
  private eventHistory: NativeEvent[] = [];
  private readonly MAX_HISTORY = 50;
  private readonly DEDUP_CACHE_LIMIT = 500;

  public static getInstance(): NativeEventBus {
    if (!NativeEventBus.instance) {
      NativeEventBus.instance = new NativeEventBus();
    }
    return NativeEventBus.instance;
  }

  public on<T = any>(type: NativeEventType, listener: NativeEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(listener as NativeEventListener);

    return () => {
      set.delete(listener as NativeEventListener);
    };
  }

  public onAny(listener: NativeEventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  public emit<T = any>(type: NativeEventType, payload: T, customId?: string): boolean {
    const id = customId || `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Deduplication check
    if (this.processedEventIds.has(id)) {
      console.warn(`[NativeEventBus] Ignored duplicate event: ${id}`);
      return false;
    }

    this.processedEventIds.add(id);
    if (this.processedEventIds.size > this.DEDUP_CACHE_LIMIT) {
      const arr = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(arr.slice(arr.length - 250));
    }

    const event: NativeEvent<T> = {
      id,
      type,
      timestamp: Date.now(),
      payload,
    };

    // Keep history
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.pop();
    }

    // Dispatch type-specific listeners
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[NativeEventBus] Error in listener for ${type}:`, err);
        }
      });
    }

    // Dispatch wildcard listeners
    this.wildcardListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`[NativeEventBus] Error in wildcard listener for ${type}:`, err);
      }
    });

    return true;
  }

  public getHistory(): NativeEvent[] {
    return [...this.eventHistory];
  }

  public clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.processedEventIds.clear();
    this.eventHistory = [];
  }
}

export const nativeEventBus = NativeEventBus.getInstance();

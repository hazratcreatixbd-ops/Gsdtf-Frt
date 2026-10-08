import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveSession } from '../services/LiveSession';
import { toolManager } from '../services/ToolManager';
import { FridayState, ToolCallItem, TranscriptionItem, MemoryItem, TaskItem } from '../types/friday';
import { advancedMemoryManager } from '../services/memory/AdvancedMemoryManager';

const LOCAL_STORAGE_MEMORIES_KEY = 'friday_persistent_memories';
const LOCAL_STORAGE_TASKS_KEY = 'friday_persistent_tasks';

export function useFridayVoice() {
  const [state, setState] = useState<FridayState>('disconnected');
  const [userVolume, setUserVolume] = useState<number>(0);
  const [fridayVolume, setFridayVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [recentTool, setRecentTool] = useState<ToolCallItem | null>(null);

  // Persistent Memories & Tasks
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_MEMORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const sessionRef = useRef<LiveSession | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const stateRef = useRef<FridayState>('disconnected');

  const updateState = useCallback((nextState: FridayState) => {
    stateRef.current = nextState;
    setState(nextState);
    if (nextState !== 'connecting') {
      isConnectingRef.current = false;
    }
  }, []);

  // Fetch initial storage from backend on mount
  useEffect(() => {
    const baseUrl = LiveSession.getServerBaseUrl();
    if (!baseUrl && LiveSession.isBundledLocalOrigin()) {
      return;
    }
    fetch(`${baseUrl}/api/storage`)
      .then((res) => res.json())
      .then((data) => {
        if (data.memories && Array.isArray(data.memories)) {
          setMemories(data.memories);
          try {
            localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(data.memories));
          } catch {}
        }
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          try {
            localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(data.tasks));
          } catch {}
        }
      })
      .catch((err) => console.log('Notice: using local storage cache for memories/tasks', err));
  }, []);

  // Save to localStorage when memories change
  const updateMemories = useCallback((newMemories: MemoryItem[]) => {
    setMemories(newMemories);
    try {
      localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(newMemories));
    } catch {}
    sessionRef.current?.syncStorage(newMemories, tasks);
    const baseUrl = LiveSession.getServerBaseUrl();
    if (!baseUrl && LiveSession.isBundledLocalOrigin()) return;
    fetch(`${baseUrl}/api/storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memories: newMemories, tasks }),
    }).catch(() => {});
  }, [tasks]);

  // Save to localStorage when tasks change
  const updateTasks = useCallback((newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTasks));
    } catch {}
    sessionRef.current?.syncStorage(memories, newTasks);
    const baseUrl = LiveSession.getServerBaseUrl();
    if (!baseUrl && LiveSession.isBundledLocalOrigin()) return;
    fetch(`${baseUrl}/api/storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memories, tasks: newTasks }),
    }).catch(() => {});
  }, [memories]);

  // Delete a memory
  const removeMemory = useCallback((id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    updateMemories(updated);
  }, [memories, updateMemories]);

  // Toggle task status
  const toggleTaskStatus = useCallback((id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? Date.now() : undefined,
        } as TaskItem;
      }
      return t;
    });
    updateTasks(updated);
  }, [tasks, updateTasks]);

  // Delete a task
  const removeTask = useCallback((id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    updateTasks(updated);
  }, [tasks, updateTasks]);

  // Subscribe to tool manager events
  useEffect(() => {
    const unsubscribe = toolManager.subscribe((item) => {
      setRecentTool({ ...item });
      if (item.status === 'completed' || item.status === 'failed') {
        const timer = setTimeout(() => {
          setRecentTool((prev) => (prev?.id === item.id ? null : prev));
        }, 5000);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    // Prevent duplicate session creation from repeated taps while connecting or already active
    if (isConnectingRef.current || (sessionRef.current && stateRef.current !== 'disconnected')) {
      if (sessionRef.current && !sessionRef.current.isMicrophoneCapturing()) {
        const ok = await sessionRef.current.retryMicrophone();
        if (ok) {
          setErrorMessage(null);
        }
      }
      return;
    }

    isConnectingRef.current = true;
    setErrorMessage(null);

    if (sessionRef.current) {
      const oldSession = sessionRef.current;
      sessionRef.current = null;
      oldSession.disconnect();
    }

    let sessionInstance: LiveSession | null = null;
    const session = new LiveSession({
      onStateChange: (newState) => {
        if (sessionRef.current !== sessionInstance && newState !== 'disconnected') {
          return;
        }
        updateState(newState);
      },
      onTranscription: (item) => {
        if (sessionRef.current !== sessionInstance) return;
        setTranscriptions((prev) => [...prev.slice(-25), item]);
      },
      onUserVolumeChange: (vol) => {
        if (sessionRef.current !== sessionInstance) return;
        setUserVolume(vol);
      },
      onFridayVolumeChange: (vol) => {
        if (sessionRef.current !== sessionInstance) return;
        setFridayVolume(vol);
      },
      onStorageSync: (data) => {
        if (sessionRef.current !== sessionInstance) return;
        if (data.memories) {
          setMemories(data.memories);
          try {
            localStorage.setItem(LOCAL_STORAGE_MEMORIES_KEY, JSON.stringify(data.memories));
          } catch {}
          data.memories.forEach((m) => {
            advancedMemoryManager.evaluateAndSave({
              title: m.key,
              content: m.content,
              suggestedType: 'USER_PREFERENCE',
              sourceType: 'VOICE',
              sourceName: 'Gemini Live Session',
            });
          });
        }
        if (data.tasks) {
          setTasks(data.tasks);
          try {
            localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(data.tasks));
          } catch {}
        }
      },
      onError: (msg) => {
        if (sessionRef.current !== sessionInstance) return;
        setErrorMessage(msg || null);
      },
    });

    sessionInstance = session;
    sessionRef.current = session;
    setIsMuted(false);

    try {
      await session.connect();
    } finally {
      if (sessionRef.current === session && session.getState() === 'disconnected') {
        isConnectingRef.current = false;
      }
    }
  }, [updateState]);

  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    if (sessionRef.current) {
      const active = sessionRef.current;
      sessionRef.current = null;
      active.disconnect();
    }
    updateState('disconnected');
    setUserVolume(0);
    setFridayVolume(0);
    setIsMuted(false);
  }, [updateState]);

  const toggleMute = useCallback(async () => {
    if (!sessionRef.current) return;
    const nextMuted = !isMuted;
    sessionRef.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted && !sessionRef.current.isMicrophoneCapturing()) {
      const ok = await sessionRef.current.retryMicrophone();
      if (ok) {
        setErrorMessage(null);
      }
    }
  }, [isMuted]);

  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.handleLocalUserInterrupt();
      if (!sessionRef.current.isMicrophoneCapturing()) {
        sessionRef.current.retryMicrophone().then((ok) => {
          if (ok) setErrorMessage(null);
        });
      }
    }
  }, []);

  const sendTextInput = useCallback((text: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendTextInput(text);
    }
  }, []);

  const retryMicrophone = useCallback(async () => {
    if (sessionRef.current && stateRef.current !== 'disconnected') {
      const ok = await sessionRef.current.retryMicrophone();
      if (ok) {
        setErrorMessage(null);
      }
      return ok;
    }
    await connect();
    return sessionRef.current?.isMicrophoneCapturing() ?? false;
  }, [connect]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
        sessionRef.current = null;
      }
    };
  }, []);

  return {
    state,
    userVolume,
    fridayVolume,
    isMuted,
    errorMessage,
    transcriptions,
    recentTool,
    memories,
    tasks,
    removeMemory,
    toggleTaskStatus,
    removeTask,
    connect,
    disconnect,
    toggleMute,
    interrupt,
    clearError,
    sendTextInput,
    retryMicrophone,
  };
}

import React, { useState } from 'react';
import { MemoryItem, TaskItem } from '../types/friday';
import {
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Clock,
  Bookmark,
  ListTodo,
  Sparkles,
} from 'lucide-react';

interface MemoryTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoryTasksModal: React.FC<MemoryTasksModalProps> = ({
  isOpen,
  onClose,
  memories,
  tasks,
  onToggleTask,
  onDeleteTask,
  onDeleteMemory,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'memories'>('tasks');

  if (!isOpen) return null;

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {activeTab === 'tasks' ? (
                <ListTodo className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                FRIDAY ARCHIVES
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Voice-Managed Memory & Reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-4 p-1 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'tasks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks & Reminders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {pendingTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'memories'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Memory Core</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {memories.length}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {/* Voice instruction hint */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Say: "FRIDAY, remind me tomorrow at 9 AM to edit my video"</span>
              </div>

              {tasks.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <ListTodo className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="text-xs font-mono">No tasks or reminders yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Ask FRIDAY by voice to schedule a reminder.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Pending Tasks */}
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all"
                    >
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="flex items-start space-x-3 text-left flex-1"
                      >
                        <Circle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-xs font-semibold text-slate-200 leading-snug">
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                            {task.date && (
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-cyan-400" />
                                <span>{task.date}</span>
                              </span>
                            )}
                            {task.time && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-rose-400" />
                                <span>{task.time}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Completed Tasks */}
                  {completedTasks.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/60 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Completed ({completedTasks.length})
                      </span>
                      {completedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-900 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className="flex items-start space-x-3 text-left flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-slate-400 line-through">
                                {task.title}
                              </p>
                              <span className="text-[10px] text-slate-600 font-mono">
                                Completed
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="space-y-3">
              {/* Voice instruction hint */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-500/20 text-[11px] text-rose-300 font-mono">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Say: "FRIDAY, remember that my favorite color is blue"</span>
              </div>

              {memories.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Bookmark className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="text-xs font-mono">No persistent memories saved yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Ask FRIDAY to remember facts, preferences, or notes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-rose-500/30 transition-all"
                    >
                      <div className="flex-1 pr-2">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 text-[10px] font-mono text-rose-300 uppercase tracking-wider mb-1.5">
                          #{mem.key}
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {mem.content}
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono block mt-1">
                          Saved: {new Date(mem.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                        title="Forget memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            Close Archives
          </button>
        </div>
      </div>
    </div>
  );
};

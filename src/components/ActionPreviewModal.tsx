/**
 * PART 6 — FRIDAY Action Preview Modal
 * Explicit user confirmation interface before executing risky or external actions
 * (such as sending a WhatsApp message, executing privileged native commands, or dispatching external data).
 */

import React from 'react';
import { ActionPreviewItem } from '../types/android';
import {
  AlertTriangle,
  Send,
  X,
  ShieldAlert,
  MessageSquare,
  Smartphone,
  CheckCircle,
} from 'lucide-react';

interface ActionPreviewModalProps {
  preview: ActionPreviewItem | null;
  onConfirm: (previewId: string) => void;
  onCancel: (previewId: string) => void;
}

export const ActionPreviewModal: React.FC<ActionPreviewModalProps> = ({
  preview,
  onConfirm,
  onCancel,
}) => {
  if (!preview || preview.status !== 'pending_confirmation') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-rose-500/50 bg-slate-950/95 p-6 shadow-[0_20px_60px_rgba(244,63,94,0.3)] animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-rose-500/30 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-rose-400 font-semibold">
                Action Preview • Confirmation Required
              </span>
              <h3 className="text-base font-semibold text-slate-100">{preview.title}</h3>
            </div>
          </div>
          <button
            onClick={() => onCancel(preview.id)}
            className="p-1 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details Grid */}
        <div className="space-y-3 font-mono text-xs mb-5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Target Application</span>
            </span>
            <span className="font-semibold text-cyan-300">{preview.appName}</span>
          </div>

          {preview.recipient && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Recipient</span>
              </span>
              <span className="font-semibold text-emerald-300">{preview.recipient}</span>
            </div>
          )}

          {preview.messagePreview && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block font-sans font-medium">
                Message Content:
              </span>
              <p className="font-sans text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                "{preview.messagePreview}"
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{preview.riskNotice}</span>
          </div>
        </div>

        {/* Voice prompt helper */}
        <p className="text-[11px] text-center font-mono text-slate-400 mb-5">
          Voice option: Say <span className="text-cyan-300 font-semibold">"Confirm"</span> or{' '}
          <span className="text-rose-400 font-semibold">"Cancel"</span> anytime.
        </p>

        {/* Confirmation Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onCancel(preview.id)}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs tracking-wider transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <X className="w-4 h-4 text-slate-400" />
            <span>Cancel</span>
          </button>
          <button
            onClick={() => onConfirm(preview.id)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center space-x-2 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Send Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

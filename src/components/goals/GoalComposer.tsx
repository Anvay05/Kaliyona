import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CreateKind } from './CreateNewDisclosure';
import { Goal, makeId } from '../../lib/goals';
import { SCENARIOS } from '../../data/scenarios';
import { AnimatedSwitch } from '../ui/animated-switch';

export interface GoalComposerProps {
  kind: CreateKind;
  onCancel: () => void;
  onSave: (g: Goal) => void;
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDueOption(type: 'today' | 'tomorrow' | 'week'): string {
  const now = new Date();
  if (type === 'today') {
    return toLocalISO(now);
  }
  if (type === 'tomorrow') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return toLocalISO(d);
  }
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  return toLocalISO(d);
}

export const GoalComposer: React.FC<GoalComposerProps> = ({
  kind,
  onCancel,
  onSave,
}) => {
  const todayISO = getDueOption('today');
  const tomorrowISO = getDueOption('tomorrow');
  const weekISO = getDueOption('week');

  const [title, setTitle] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>(
    undefined
  );
  const [dueISO, setDueISO] = useState<string | undefined>(
    kind === 'reminder' ? tomorrowISO : undefined
  );
  const [remind, setRemind] = useState<boolean>(kind === 'reminder');

  const titlePlaceholder =
    kind === 'goal'
      ? 'e.g. Bargain at the market in Kannada'
      : kind === 'note'
      ? 'e.g. 5 market words I learned'
      : 'e.g. Practice auto-rickshaw phrases';

  const titleHeader =
    kind === 'goal' ? 'New Goal' : kind === 'note' ? 'New Note' : 'New Reminder';

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (kind === 'reminder' && !dueISO) return;

    onSave({
      id: makeId(),
      type: kind,
      title: trimmed,
      scenarioId: selectedScenarioId || undefined,
      dueISO,
      remind: kind === 'reminder' ? true : remind,
      done: false,
      createdAt: Date.now(),
    });
  };

  const handleApplyTemplate = (
    tmplTitle: string,
    scenarioIdKey: string
  ) => {
    setTitle(tmplTitle);
    const foundScenario = SCENARIOS.find(
      (s) => s.id === scenarioIdKey || s.id.includes(scenarioIdKey)
    );
    if (foundScenario) {
      setSelectedScenarioId(foundScenario.id);
    }
    setDueISO(tomorrowISO);
    setRemind(true);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3 shadow-sm text-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          {titleHeader}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="h-6 w-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Title Input */}
      <div>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder={titlePlaceholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[15px] text-neutral-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-neutral-400"
        />
      </div>

      {/* Scenario Chips (Goal & Note only) */}
      {kind !== 'reminder' && (
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase font-semibold tracking-wider text-neutral-400 block">
            Link Scenario (Optional)
          </label>
          <div className="flex gap-2 overflow-x-auto py-0.5 no-scrollbar">
            {/* None Chip */}
            <button
              type="button"
              onClick={() => setSelectedScenarioId(undefined)}
              className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                !selectedScenarioId
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              None
            </button>
            {SCENARIOS.map((scenario) => {
              const isSelected = selectedScenarioId === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() =>
                    setSelectedScenarioId(isSelected ? undefined : scenario.id)
                  }
                  className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {scenario.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Due Chips (Goal & Reminder only) */}
      {kind !== 'note' && (
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase font-semibold tracking-wider text-neutral-400 block">
            {kind === 'reminder' ? 'Due Date (Required)' : 'Due Date (Optional)'}
          </label>
          <div className="flex gap-2 overflow-x-auto py-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setDueISO(todayISO)}
              className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                dueISO === todayISO
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDueISO(tomorrowISO)}
              className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                dueISO === tomorrowISO
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setDueISO(weekISO)}
              className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                dueISO === weekISO
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              This week
            </button>
            {kind !== 'reminder' && (
              <button
                type="button"
                onClick={() => setDueISO(undefined)}
                className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  !dueISO
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Remind Switch (Goal: optional, Reminder: locked ON) */}
      {kind !== 'note' && (
        <div className="flex justify-between items-center py-1">
          <span className="text-[14px] text-neutral-700">Remind me when due</span>
          <AnimatedSwitch
            size="sm"
            checked={kind === 'reminder' ? true : remind}
            disabled={kind === 'reminder'}
            onCheckedChange={(val) => {
              if (kind !== 'reminder') setRemind(val);
            }}
            aria-label="Remind me when due"
          />
        </div>
      )}

      {/* Templates (Goal only) */}
      {kind === 'goal' && (
        <div className="space-y-1.5 pt-1 border-t border-neutral-100">
          <span className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold block">
            Quick start
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleApplyTemplate('Order darshini breakfast', 'darshini')
              }
              className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[13px] text-neutral-600 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Order darshini breakfast
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('Bargain at a market', 'market')}
              className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[13px] text-neutral-600 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Bargain at a market
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('Ask for directions', 'bmtc')}
              className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[13px] text-neutral-600 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Ask for directions
            </button>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-2 items-center pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-500 text-[14px] px-3 py-2 hover:text-neutral-800 transition-colors cursor-pointer font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!title.trim() || (kind === 'reminder' && !dueISO)}
          onClick={handleSave}
          className="rounded-full bg-primary px-5 py-2 text-[14px] font-medium text-white disabled:opacity-40 disabled:pointer-events-none transition-colors hover:bg-primary/90 cursor-pointer shadow-xs"
        >
          Save
        </button>
      </div>
    </div>
  );
};

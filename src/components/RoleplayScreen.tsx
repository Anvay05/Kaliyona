import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Send,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Bookmark,
  Check,
} from 'lucide-react';
import {
  ROLEPLAY_SCENARIOS,
  RoleplayScenario,
  speakKanglishPhrase,
  playTactileTone,
} from '../data/kanglishData';
import { useSpeakingState } from '../utils/speechUtils';
import { useProgress } from '../store/progressStore';
import { useWallet } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';
import { VoiceNote, VoiceNoteGroup } from './ui/VoiceNote';
import { chatWithAnna } from '../voice/anna-brain';

interface ChatMessage {
  id: string;
  sender: 'anna' | 'user';
  kannada?: string;
  translit: string;
  english: string;
  feedback?: string;
}

interface RoleplayScreenProps {
  initialSituationId?: string;
  onBack: () => void;
  onEarnXp: (xp: number) => void;
}

export const RoleplayScreen: React.FC<RoleplayScreenProps> = ({
  initialSituationId,
  onBack,
  onEarnXp,
}) => {
  const { isSpeaking } = useSpeakingState();
  const { recordRoleplayComplete } = useProgress();
  const wallet = useWallet();
  const [saveToastMsg, setSaveToastMsg] = useState<string | null>(null);

  const handleSaveRoleplayLine = (kn: string, translit: string, en: string) => {
    playTactileTone('success');
    wallet.saveItem({
      kn: kn || translit,
      translit,
      en,
      source: 'roleplay',
    });
    setSaveToastMsg(STRINGS.wallet.savedToast);
    setTimeout(() => setSaveToastMsg(null), 2400);
  };

  const defaultScenario =
    ROLEPLAY_SCENARIOS.find((s) => s.situationId === initialSituationId) ||
    ROLEPLAY_SCENARIOS[0];

  const [scenario, setScenario] = useState<RoleplayScenario>(defaultScenario);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [showEnglish, setShowEnglish] = useState<boolean>(true);
  const [customInput, setCustomInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-0',
      sender: 'anna',
      kannada: defaultScenario.initialGreetingKannada,
      translit: defaultScenario.initialGreetingTranslit,
      english: defaultScenario.initialGreetingEnglish,
    },
    {
      id: 'init-1',
      sender: 'anna',
      kannada: defaultScenario.turns[0].annaKannada,
      translit: defaultScenario.turns[0].annaTranslit,
      english: defaultScenario.turns[0].annaEnglish,
    },
  ]);

  const handleSelectScenario = (nextScenario: RoleplayScenario) => {
    playTactileTone('tap');
    setScenario(nextScenario);
    setTurnIndex(0);
    setMessages([
      {
        id: `${nextScenario.id}-0`,
        sender: 'anna',
        kannada: nextScenario.initialGreetingKannada,
        translit: nextScenario.initialGreetingTranslit,
        english: nextScenario.initialGreetingEnglish,
      },
      {
        id: `${nextScenario.id}-1`,
        sender: 'anna',
        kannada: nextScenario.turns[0].annaKannada,
        translit: nextScenario.turns[0].annaTranslit,
        english: nextScenario.turns[0].annaEnglish,
      },
    ]);
  };

  const handleChooseOption = (option: {
    translit: string;
    kannada: string;
    english: string;
    feedback: string;
    isBest: boolean;
  }) => {
    playTactileTone('success');
    speakKanglishPhrase(option.translit, option.kannada);
    onEarnXp(15);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      kannada: option.kannada,
      translit: option.translit,
      english: option.english,
      feedback: option.feedback,
    };

    const nextIdx = turnIndex + 1;
    if (nextIdx < scenario.turns.length) {
      const nextTurn = scenario.turns[nextIdx];
      const annaReply: ChatMessage = {
        id: `anna-${Date.now() + 1}`,
        sender: 'anna',
        kannada: nextTurn.annaKannada,
        translit: nextTurn.annaTranslit,
        english: nextTurn.annaEnglish,
      };
      setMessages((prev) => [...prev, userMsg, annaReply]);
      setTurnIndex(nextIdx);
    } else {
      const finalReply: ChatMessage = {
        id: `anna-final-${Date.now() + 1}`,
        sender: 'anna',
        kannada: 'ಸಕ್ಕತ್ ಆಗಿ ಕನ್ನಡ ಮಾತಾಡ್ತೀರಾ ಸಾರ್! ಬನ್ನಿ ಹೋಗೋಣ!',
        translit: 'Sakkath aagi Kannada maathaadthira sir! Banni hogona!',
        english: 'You speak Kannada awesomely! Come, let us go!',
      };
      setMessages((prev) => [...prev, userMsg, finalReply]);
      setTurnIndex(nextIdx);
      recordRoleplayComplete();
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = customInput.trim();
    if (!text) return;
    setCustomInput('');
    playTactileTone('tap');
    onEarnXp(15);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      translit: text,
      english: 'Sent in English / Kanglish',
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);

    const aiReply = await chatWithAnna(
      text,
      nextHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'anna',
        text: m.translit,
        kanglish: m.translit,
        script: m.kannada,
        english: m.english,
      })),
      {
        id: scenario.id,
        title: scenario.characterName,
        tagline: scenario.subtitle,
        setting: scenario.settingDescription,
      }
    );

    const replyId = `anna-${Date.now() + 1}`;
    const annaReply: ChatMessage = {
      id: replyId,
      sender: 'anna',
      kannada: aiReply.script || aiReply.kanglish,
      translit: aiReply.kanglish,
      english: aiReply.english,
    };

    setMessages((prev) => [...prev, annaReply]);
    setPlayingMsgId(replyId);
    speakKanglishPhrase(annaReply.translit, annaReply.kannada);
    const replyDurMs =
      Math.max(2, Math.min(4, Math.ceil((annaReply.translit || '').length / 18))) *
      1000;
    window.setTimeout(() => {
      setPlayingMsgId((cur) => (cur === replyId ? null : cur));
    }, replyDurMs);
  };

  const handleVoiceSimulate = () => {
    if (isListening) return;
    playTactileTone('tap');
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const currentTurn = scenario.turns[turnIndex];
      if (currentTurn && currentTurn.options[0]) {
        handleChooseOption(currentTurn.options[0]);
      }
    }, 1500);
  };

  const currentTurn = scenario.turns[turnIndex];
  const isCompleted = turnIndex >= scenario.turns.length;

  return (
    <div
      className="rounded-[28px] p-4 sm:p-7 min-h-[calc(100vh-120px)] flex flex-col justify-between border"
      style={{
        backgroundColor: 'var(--d-bg)',
        borderColor: 'var(--d-line)',
        color: 'var(--d-text)',
      }}
    >
      {/* Top Header & Scenario Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--d-line)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-[var(--d-surface)] border border-[var(--d-line)] flex items-center justify-center text-[var(--d-text)] hover:border-[var(--accent)] cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="mono-label text-[var(--accent2)]">
                NIGHT CONVERSATION MODE · AI ROLEPLAY
              </span>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--d-text)]">
                {scenario.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEnglish((s) => !s)}
              className="px-3 py-2 rounded-xl bg-[var(--d-surface)] border border-[var(--d-line)] text-xs font-mono-accent text-[var(--d-text)] flex items-center gap-1.5 hover:border-[var(--accent)] cursor-pointer"
            >
              {showEnglish ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-[var(--accent2)]" />
                  <span>Hide English</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-[var(--accent2)]" />
                  <span>Show English</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSelectScenario(scenario)}
              className="px-3 py-2 rounded-xl bg-[var(--d-surface)] border border-[var(--d-line)] text-xs font-mono-accent text-[var(--d-muted)] hover:text-[var(--d-text)] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>
        </div>

        {/* Scenario Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ROLEPLAY_SCENARIOS.map((sc) => {
            const active = sc.id === scenario.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-[var(--d-surface)] border-[var(--d-line)] text-[var(--d-muted)] hover:text-[var(--d-text)]'
                }`}
              >
                <span>{sc.characterName}</span>
              </button>
            );
          })}
        </div>

        {/* Scene Context Banner */}
        <div className="p-3.5 rounded-2xl bg-[var(--d-surface)] border border-[var(--d-line)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-mono-accent text-[var(--accent2)]">
                {scenario.characterName} · {scenario.subtitle}
              </p>
              <p className="text-xs text-[var(--d-muted)] mt-0.5">
                {scenario.settingDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      {saveToastMsg && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg">
          {saveToastMsg}
        </div>
      )}
      <VoiceNoteGroup className="anna-chat-wallpaper my-5 rounded-3xl border border-outline-variant/60 p-3.5 sm:p-5 space-y-3.5 flex-1 overflow-y-auto shadow-inner">
        {messages.map((msg, idx) => {
          const itemKn = msg.kannada || msg.translit;
          const saved = wallet.isSaved(itemKn);
          const estimatedDuration = Math.max(
            2,
            Math.min(4, Math.ceil((msg.translit || '').length / 18))
          );
          return (
            <div
              key={msg.id}
              className={`w-full flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`w-fit min-w-[245px] sm:min-w-[295px] max-w-[92%] sm:max-w-[80%] rounded-2xl px-4 py-3 border shadow-xs text-left space-y-2 ${
                  msg.sender === 'user'
                    ? 'rounded-br-xs bg-gradient-to-br from-[#6c5ce7] to-[#5341cd] border-[#5341cd] text-white'
                    : 'rounded-bl-xs bg-white/95 backdrop-blur-xs border-indigo-200/80 text-[var(--d-text)]'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-3 pb-1.5 border-b ${
                    msg.sender === 'user'
                      ? 'border-white/20'
                      : 'border-indigo-100/80'
                  }`}
                >
                  <span
                    className={`mono-label !text-[10px] ${
                      msg.sender === 'user'
                        ? 'text-white/85'
                        : 'text-[var(--accent2)]'
                    }`}
                  >
                    {msg.sender === 'anna' ? scenario.characterName : 'YOU'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveRoleplayLine(itemKn, msg.translit, msg.english)
                      }
                      aria-label={saved ? 'Saved in Notes' : 'Save to Notes'}
                      title={saved ? 'Saved in Notes ✓' : 'Save to Notes 🔖'}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono-accent cursor-pointer transition-colors ${
                        saved
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                          : msg.sender === 'user'
                          ? 'border-white/30 bg-white/15 text-white hover:bg-white/25'
                          : 'border-[var(--d-line)] text-[var(--d-muted)] hover:border-[var(--accent)] hover:text-[var(--d-text)]'
                      }`}
                    >
                      {saved ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {msg.kannada && (
                  <p
                    className={`w-full whitespace-normal break-words text-left text-sm sm:text-base font-semibold leading-snug ${
                      msg.sender === 'user' ? 'text-white/95' : 'text-[var(--accent2)]'
                    }`}
                  >
                    {msg.kannada}
                  </p>
                )}

                {msg.sender === 'anna' && (
                  <div className="pt-0.5">
                    <VoiceNote
                      size="sm"
                      bars={28}
                      seed={idx * 17 + msg.translit.length}
                      duration={estimatedDuration}
                      accent="#1D63FF"
                      playing={playingMsgId === msg.id}
                      onPlayingChange={(nextPlaying) => {
                        if (nextPlaying) {
                          setPlayingMsgId(msg.id);
                          speakKanglishPhrase(msg.translit, msg.kannada);
                          window.setTimeout(() => {
                            setPlayingMsgId((cur) =>
                              cur === msg.id ? null : cur
                            );
                          }, estimatedDuration * 1000);
                        } else {
                          setPlayingMsgId((cur) =>
                            cur === msg.id ? null : cur
                          );
                          if (
                            typeof window !== 'undefined' &&
                            'speechSynthesis' in window
                          ) {
                            window.speechSynthesis.cancel();
                          }
                        }
                      }}
                    />
                  </div>
                )}

                <p
                  className={`w-full whitespace-normal break-words text-left translit-text leading-snug ${
                    msg.sender === 'user'
                      ? 'text-white font-semibold'
                      : 'text-[var(--d-text)] font-bold'
                  }`}
                >
                  {msg.sender === 'anna' ? `“${msg.translit}”` : msg.translit}
                </p>

                {showEnglish && msg.english && (
                  <p
                    className={`w-full whitespace-normal break-words text-left text-xs pt-1.5 border-t leading-relaxed ${
                      msg.sender === 'user'
                        ? 'border-white/20 text-white/85'
                        : 'border-indigo-100/80 text-[var(--d-muted)]'
                    }`}
                  >
                    {msg.english}
                  </p>
                )}
              </div>

              {msg.feedback && (
                <div className="mt-1.5 max-w-md px-3 py-1.5 rounded-xl bg-white/95 border border-[var(--success)] text-[11px] text-[var(--d-text)] flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                  <span>{msg.feedback}</span>
                </div>
              )}
            </div>
          );
        })}
      </VoiceNoteGroup>

      {/* Interactive Response Deck */}
      <div className="pt-4 border-t border-[var(--d-line)] space-y-4">
        {!isCompleted && currentTurn ? (
          <>
            <div className="flex items-center justify-between">
              <span className="mono-label text-[var(--d-muted)]">
                CHOOSE YOUR KANGLISH REPLY (OR SPEAK)
              </span>
              <span className="mono-label text-[var(--accent2)]">
                TURN {turnIndex + 1} OF {scenario.turns.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentTurn.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChooseOption(opt)}
                  className="p-3.5 rounded-2xl bg-[var(--d-surface)] border border-[var(--d-line)] hover:border-[var(--accent)] text-left transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <p className="translit-text text-[var(--d-text)] group-hover:text-[var(--accent2)] !text-sm">
                      &ldquo;{opt.translit}&rdquo;
                    </p>
                    <p className="text-xs text-[var(--d-muted)] mt-1">{opt.kannada}</p>
                  </div>
                  {showEnglish && (
                    <p className="text-[11px] text-[var(--d-muted)] mt-2 pt-2 border-t border-[var(--d-line)]">
                      {opt.english}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--d-surface)] border border-[var(--accent2)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="mono-label text-[var(--accent2)]">
                ROLEPLAY COMPLETE · +45 XP EARNED
              </span>
              <p className="font-display font-semibold text-lg text-[var(--d-text)] mt-0.5">
                You handled {scenario.characterName} like a true Bengaluru local!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSelectScenario(scenario)}
                className="btn-primary !py-2.5 !px-4 !text-xs"
              >
                Replay Conversation
              </button>
            </div>
          </div>
        )}

        {/* Free-form Kanglish Input + Voice Mic Bar with Cyan Glow */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleVoiceSimulate}
            style={{ boxShadow: '0 0 40px rgba(34,211,238,0.25)' }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all ${
              isListening
                ? 'bg-[var(--error)] text-white animate-pulse'
                : 'bg-[var(--accent)] text-white hover:brightness-105'
            }`}
            title="Speak reply in Kanglish"
            aria-label="Speak reply in Kanglish"
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={
              isListening
                ? 'Listening...'
                : 'Write in English...'
            }
            className="flex-1 h-11 px-4 rounded-2xl bg-[var(--d-surface)] border border-[var(--d-line)] text-sm text-[var(--d-text)] placeholder-[var(--d-muted)] focus:outline-none focus:border-[var(--accent)]"
          />

          <button
            type="submit"
            className="h-11 px-4 rounded-2xl bg-[var(--d-surface)] border border-[var(--d-line)] hover:border-[var(--accent)] text-[var(--d-text)] flex items-center gap-1.5 text-xs font-mono-accent cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 text-[var(--accent2)]" />
            <span className="hidden sm:inline">SEND</span>
          </button>
        </form>
      </div>
    </div>
  );
};

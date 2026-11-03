import React, { useState, useEffect } from 'react';
import {
  Brain,
  Key,
  Globe,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  getAiConfig,
  saveAiConfig,
  clearAiConfig,
  testAiConnection,
  getMaskedApiKey,
  DEFAULT_BASE_URL,
  ANNA_MODEL,
} from '@/lib/aiConfig';

export function AiSettingsCard() {
  // SECURITY NOTE: For production, API keys should be stored server-side,
  // but this client-side localStorage storage is acceptable for the hackathon demo context only.
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    const config = getAiConfig();
    return config.baseUrl || DEFAULT_BASE_URL;
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    const config = getAiConfig();
    return config.userApiKey || '';
  });
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testState, setTestState] = useState<{
    loading: boolean;
    success?: boolean;
    reply?: string;
    error?: string;
  }>({ loading: false });

  // Load saved config on mount & listen to localStorage changes
  const refreshFromStorage = () => {
    const config = getAiConfig();
    setBaseUrl(config.baseUrl || DEFAULT_BASE_URL);
    setApiKey(config.userApiKey || '');
  };

  useEffect(() => {
    refreshFromStorage();
    const handleStorageChange = () => refreshFromStorage();
    window.addEventListener('anna_ai_config_changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('anna_ai_config_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleBaseUrlChange = (nextUrl: string) => {
    setBaseUrl(nextUrl);
    saveAiConfig({
      baseUrl: nextUrl.trim() || DEFAULT_BASE_URL,
    });
  };

  const handleApiKeyChange = (nextKey: string) => {
    setApiKey(nextKey);
    const trimmed = nextKey.trim();
    // Immediately write trimmed key to localStorage (or remove if empty so it falls back to built-in default key)
    saveAiConfig({
      apiKey: trimmed,
    });
  };

  const handleSave = () => {
    const trimmedUrl = baseUrl.trim() || DEFAULT_BASE_URL;
    const trimmedKey = apiKey.trim();
    setBaseUrl(trimmedUrl);
    setApiKey(trimmedKey);

    saveAiConfig({
      baseUrl: trimmedUrl,
      apiKey: trimmedKey,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  const handleTestConnection = async () => {
    setTestState({ loading: true });
    const trimmedUrl = baseUrl.trim() || DEFAULT_BASE_URL;
    const trimmedKey = apiKey.trim();
    setBaseUrl(trimmedUrl);
    setApiKey(trimmedKey);

    // Immediately persist to localStorage before testing
    saveAiConfig({
      baseUrl: trimmedUrl,
      apiKey: trimmedKey,
    });

    const result = await testAiConnection({
      baseUrl: trimmedUrl,
      apiKey: trimmedKey,
    });

    if (result.ok) {
      setTestState({
        loading: false,
        success: true,
        reply: result.reply,
      });
    } else {
      setTestState({
        loading: false,
        success: false,
        error: result.error,
      });
    }
  };

  const handleClear = () => {
    clearAiConfig();
    setBaseUrl(DEFAULT_BASE_URL);
    setApiKey('');
    setTestState({ loading: false });
    setSaveSuccess(false);
  };

  const hasCustomUserKey = Boolean(apiKey.trim());

  return (
    <div id="ai-settings-card" className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono-label text-[var(--muted)] !text-[11px] block">
          AI &amp; BRAIN SETTINGS
        </span>
        {hasCustomUserKey ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Key saved ✓ ({getMaskedApiKey(apiKey)})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
            <CheckCircle2 size={12} className="text-indigo-600" />
            Built-in demo key active ✓
          </span>
        )}
      </div>

      <div className="anim-panel-slide-up glass-strong relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-[var(--line)] bg-white/70 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 border border-indigo-200/80 text-primary shadow-2xs">
              <Brain className="w-5 h-5 text-[#6c5ce7]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-neutral-900 leading-tight flex items-center gap-1.5">
                Anna&rsquo;s Brain 🧠
              </h3>
              <p className="text-[12px] text-neutral-600 leading-tight mt-0.5">
                Ready out-of-the-box · Optional custom API key override
              </p>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3 pt-1">
          {/* Base URL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
              <Globe size={13} className="text-neutral-500" />
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="https://api.apinex.bond/v1"
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white/90 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-neutral-500">
              OpenAI-compatible endpoint (defaults to apinex.bond)
            </p>
          </div>

          {/* API Key (Optional Override) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <Key size={13} className="text-neutral-500" />
                API Key <span className="text-[11px] font-normal text-neutral-500">(Optional)</span>
              </label>
              {hasCustomUserKey && (
                <span className="text-[11px] font-medium text-emerald-600">
                  Key saved ({getMaskedApiKey(apiKey)})
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Optional: paste your own API key override"
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-neutral-200 bg-white/90 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 transition"
                title={showKey ? 'Hide API key' : 'Show API key'}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-600 font-medium">
              App runs on a built-in demo key — add your own key here only if you want
            </p>
          </div>

          {/* Read-only Model Line */}
          <div className="pt-0.5">
            <p className="text-[12px] text-neutral-500 font-medium">
              Model: <span className="font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">{ANNA_MODEL}</span>
            </p>
          </div>
        </div>

        {/* Test connection output inline banner */}
        {testState.loading && (
          <div className="anim-panel-slide-up flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs">
            <Loader2 size={14} className="animate-spin text-indigo-600 shrink-0" />
            <span>Pinging Anna on free/kimi-k3...</span>
          </div>
        )}

        {!testState.loading && testState.success && (
          <div className="anim-panel-slide-up p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 size={14} />
              Connected ✓ — Anna is online
            </div>
            {testState.reply && (
              <p className="text-[11px] text-emerald-600/90 font-mono bg-white/60 p-1.5 rounded-lg border border-emerald-100">
                &ldquo;{testState.reply}&rdquo;
              </p>
            )}
          </div>
        )}

        {!testState.loading && testState.error && (
          <div className="anim-panel-slide-up p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              Connection Failed
            </div>
            <p className="text-[11px] text-rose-600 font-mono bg-white/60 p-1.5 rounded-lg border border-rose-100 break-all">
              {testState.error}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check size={14} />
                Saved ✓
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Save Settings
              </>
            )}
          </button>

          {/* Test Connection Button */}
          <button
            type="button"
            disabled={testState.loading}
            onClick={handleTestConnection}
            className="min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50/70 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {testState.loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-amber-500" />
                Test Connection
              </>
            )}
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/70 border border-transparent transition flex items-center gap-1 cursor-pointer ml-auto"
          >
            <RotateCcw size={13} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

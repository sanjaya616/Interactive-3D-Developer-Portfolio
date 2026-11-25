import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  EyeOff,
  Flag,
  LogIn,
  MessageSquarePlus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { getCountryByCode, WHISPER_COUNTRIES } from '../data/countries';
import { useAppState } from '../state/AppStateContext';
import type { WhisperReportReason } from '../types/portfolio';

const MAX_WHISPER_CHARS = 30;

export const WhispersPage: React.FC = () => {
  const {
    whispers,
    whispersLoading,
    whispersError,
    postWhisper,
    reportWhisper,
    moderationWhispers,
    moderateWhisper,
    removeWhisper,
    authUser,
    authBusy,
    playerDisplayName,
    signInGoogle,
  } = useAppState();

  const [authorName, setAuthorName] = useState(playerDisplayName);
  const [countryCode, setCountryCode] = useState('LK');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<WhisperReportReason>('spam');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  useEffect(() => {
    setAuthorName((prev) => (prev && prev !== 'Explorer' ? prev : playerDisplayName));
  }, [playerDisplayName]);

  const filteredWhispers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return whispers;
    return whispers.filter((w) => {
      const country = getCountryByCode(w.countryCode).name.toLowerCase();
      return (
        w.author.toLowerCase().includes(q) ||
        w.message.toLowerCase().includes(q) ||
        country.includes(q)
      );
    });
  }, [whispers, searchTerm]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const cleanName = authorName.replace(/\s+/g, ' ').trim();
    const cleanMsg = message.replace(/\s+/g, ' ').trim();

    if (cleanName.length < 2 || cleanName.length > 24) {
      setSubmitError('Display name must be 2–24 characters.');
      return;
    }
    if (cleanMsg.length < 1 || cleanMsg.length > MAX_WHISPER_CHARS) {
      setSubmitError(`Message must be 1–${MAX_WHISPER_CHARS} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await postWhisper(cleanName, countryCode, cleanMsg);
      setMessage('');
      setSubmitSuccess('Whisper stored and published to the world board!');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to publish Whisper.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReport = async (whisperId: string) => {
    const target = whispers.find((w) => w.id === whisperId);
    if (!target) return;
    setReportBusy(true);
    setReportNotice(null);
    try {
      await reportWhisper(target, reportReason);
      setReportingId(null);
      setReportNotice('Thank you. Your abuse report was recorded for moderation review.');
    } catch (err) {
      setReportNotice(
        err instanceof Error
          ? err.message
          : 'You may have already reported this Whisper or lack permission.',
      );
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <PortfolioLayout
      title="VISITOR WHISPERS"
      subtitle="Guestbook · Leave a short 30-character note stored securely in Cloud Firestore"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Live Published Messages Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-extrabold tracking-wider text-[#61564E]">
              PUBLISHED MESSAGES ({filteredWhispers.length})
            </div>

            <div className="relative w-full sm:w-64">
              <label htmlFor="wh-search" className="sr-only">
                Search visitor whispers
              </label>
              <Search className="w-4 h-4 text-[#61564E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="wh-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, country, note..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-xs font-bold text-[#26211E] placeholder:text-[#61564E]/60 focus:outline-none focus:border-[#EC6D2C]"
              />
            </div>
          </div>

          {whispersError && (
            <div className="p-4 rounded-2xl bg-[#FFF9F0] border-2 border-[#E65448] text-sm font-bold text-[#E65448]">
              {whispersError}
            </div>
          )}

          {reportNotice && (
            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border-2 border-[#21968B] text-xs font-extrabold text-[#26211E]">
              {reportNotice}
            </div>
          )}

          {whispersLoading ? (
            <div className="ui-card bg-[#FFF9F0] rounded-2xl p-8 text-center text-sm font-bold text-[#61564E]">
              Loading live guestbook messages...
            </div>
          ) : filteredWhispers.length === 0 ? (
            <div className="bg-[#F5E9D4]/80 border-2 border-[#26211E] rounded-2xl p-8 shadow-[0_5px_0_#26211E] text-center">
              <MessageSquarePlus className="w-8 h-8 text-[#EC6D2C] mx-auto" />
              <h2 className="font-display text-3xl font-bold text-[#26211E] mt-2">
                {searchTerm.trim() ? 'NO MATCHING WHISPERS' : 'BE THE FIRST TO LEAVE A WHISPER'}
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-[#61564E]">
                {searchTerm.trim()
                  ? 'Try clearing your search filter to see all published visitor notes.'
                  : 'Only verified messages successfully stored in Cloud Firestore appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredWhispers.map((w) => {
                const country = getCountryByCode(w.countryCode);
                const isReporting = reportingId === w.id;
                return (
                  <article
                    key={w.id}
                    className="ui-card ui-card-interactive bg-[#FFF9F0] rounded-2xl p-4 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#61564E]">
                        <span className="truncate text-[#26211E] font-extrabold">
                          <span aria-hidden="true" className="mr-1.5">
                            {country.flag}
                          </span>
                          {w.author}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F5E9D4] border border-[#D9C3A3] text-[10px] font-extrabold text-[#26211E] shrink-0">
                          {w.createdAt}
                        </span>
                      </div>
                      <p className="mt-2 text-base font-extrabold text-[#26211E] break-words">
                        &ldquo;{w.message}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E6D3B5] flex items-center justify-between gap-2 text-[11px] font-bold text-[#61564E]">
                      <span>{country.name}</span>
                      {authUser && authUser.uid !== w.authorUid && (
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(isReporting ? null : w.id);
                            setReportReason('spam');
                          }}
                          className="inline-flex items-center gap-1 text-[#61564E] hover:text-[#E65448] transition-colors cursor-pointer"
                          aria-label={`Report message from ${w.author}`}
                        >
                          <Flag className="w-3 h-3" />
                          <span>{isReporting ? 'Cancel' : 'Report'}</span>
                        </button>
                      )}
                    </div>

                    {isReporting && (
                      <div className="p-2.5 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3] space-y-2">
                        <label
                          htmlFor={`report-reason-${w.id}`}
                          className="block text-[10px] font-extrabold text-[#26211E]"
                        >
                          REPORT REASON
                        </label>
                        <select
                          id={`report-reason-${w.id}`}
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value as WhisperReportReason)}
                          className="w-full px-2 py-1 rounded-lg border border-[#D9C3A3] bg-[#FFF9F0] text-xs font-bold text-[#26211E]"
                        >
                          <option value="spam">Spam or promotion</option>
                          <option value="offensive">Offensive content</option>
                          <option value="harassment">Harassment</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          type="button"
                          disabled={reportBusy}
                          onClick={() => void handleConfirmReport(w.id)}
                          className="w-full py-1.5 rounded-lg bg-[#E65448] text-[#FFF9F0] text-[11px] font-extrabold hover:brightness-95 transition-all cursor-pointer"
                        >
                          {reportBusy ? 'Submitting...' : 'Submit Report'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Admin Moderation Queue (only visible to verified admin) */}
          {authUser?.isAdmin && (
            <section
              aria-label="Moderation Queue"
              className="mt-6 bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_5px_0_#26211E] space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#26211E]">
                  <ShieldCheck className="w-5 h-5 text-[#EC6D2C]" />
                  <h2 className="font-display text-3xl font-bold leading-none">
                    MODERATION CONSOLE ({moderationWhispers.length})
                  </h2>
                </div>
              </div>

              {moderationWhispers.length === 0 ? (
                <p className="text-xs font-bold text-[#61564E]">No stored Whispers to moderate yet.</p>
              ) : (
                <div className="space-y-2">
                  {moderationWhispers.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[#26211E]">
                          {getCountryByCode(item.countryCode).flag} {item.author} ·{' '}
                          <span className="uppercase text-[#EC6D2C]">{item.status}</span> ·{' '}
                          <span className="text-[#61564E]">Reports: {item.reportCount}</span>
                        </div>
                        <div className="text-sm font-bold text-[#26211E]">&ldquo;{item.message}&rdquo;</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => void moderateWhisper(item.id, 'published')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#21968B] text-[#FFF9F0] text-[11px] font-extrabold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Publish</span>
                          </button>
                        )}
                        {item.status !== 'removed' && (
                          <button
                            type="button"
                            onClick={() => void moderateWhisper(item.id, 'removed')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] text-[#26211E] text-[11px] font-extrabold hover:border-[#26211E] cursor-pointer"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeWhisper(item.id)}
                          aria-label={`Delete whisper by ${item.author}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E65448] text-[#FFF9F0] text-[11px] font-extrabold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Compose Form */}
        <aside className="lg:col-span-5 bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_5px_0_#26211E]">
          <div className="flex items-center gap-2 text-[#21968B]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-extrabold tracking-wider">SPAM-GUARDED GUESTBOOK</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-[#26211E] mt-1">
            LEAVE A WHISPER
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm font-semibold text-[#61564E] leading-relaxed">
            Pick your display name, country flag, and write a concise 30-character greeting. Rate-limited &amp; checked server-side before saving to Cloud Firestore.
          </p>

          {!authUser ? (
            <div className="mt-5 p-4 rounded-xl bg-[#FFF9F0] border-2 border-[#D9C3A3] space-y-3">
              <p className="text-xs font-bold text-[#26211E]">
                Browsing is open to everyone. Sign in with Google to verify your visitor note and help keep the board spam-free.
              </p>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signInGoogle()}
                className="w-full py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{authBusy ? 'Signing in...' : 'Sign in with Google to Post'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePost} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="wh-author" className="block text-xs font-extrabold text-[#26211E] mb-1">
                  Display Name
                </label>
                <input
                  id="wh-author"
                  type="text"
                  maxLength={24}
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:border-[#EC6D2C]"
                />
              </div>

              <div>
                <label htmlFor="wh-country" className="block text-xs font-extrabold text-[#26211E] mb-1">
                  Country Flag
                </label>
                <select
                  id="wh-country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:border-[#EC6D2C]"
                >
                  {WHISPER_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="wh-msg" className="text-xs font-extrabold text-[#26211E]">
                    Short Message
                  </label>
                  <span
                    className={`text-[11px] font-extrabold tabular-nums ${
                      message.length >= MAX_WHISPER_CHARS ? 'text-[#E65448]' : 'text-[#61564E]'
                    }`}
                  >
                    {message.length}/{MAX_WHISPER_CHARS}
                  </span>
                </div>
                <input
                  id="wh-msg"
                  type="text"
                  maxLength={MAX_WHISPER_CHARS}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_WHISPER_CHARS))}
                  placeholder="Cool 3D world!"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:border-[#EC6D2C]"
                />
              </div>

              {submitError && (
                <p className="text-xs font-extrabold text-[#E65448]">{submitError}</p>
              )}
              {submitSuccess && (
                <p className="text-xs font-extrabold text-[#21968B]">{submitSuccess}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-[#CC5318] transition-colors cursor-pointer disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Verifying & Publishing...' : 'Publish Whisper'}</span>
              </button>
            </form>
          )}
        </aside>
      </div>
    </PortfolioLayout>
  );
};

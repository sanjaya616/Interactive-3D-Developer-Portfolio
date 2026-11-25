import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { DEVELOPER_PROFILE, SERVICES_LIST } from '../data/portfolioData';

export const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic');
  const validInitial =
    initialTopic && SERVICES_LIST.some((s) => s.title === initialTopic)
      ? initialTopic
      : SERVICES_LIST[0].title;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(validInitial);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [draftReady, setDraftReady] = useState<{
    mailtoHref: string;
    summaryText: string;
  } | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    if (initialTopic && SERVICES_LIST.some((s) => s.title === initialTopic)) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(DEVELOPER_PROFILE.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // Fallback if clipboard API blocked in frame
      setCopiedEmail(false);
    }
  };

  const handlePrepareEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !notes.trim()) {
      setError('Please complete your name, email, and project details.');
      return;
    }
    setError('');
    const subject = `[Portfolio Inquiry] ${topic} — ${name.trim()}`;
    const body = [
      `Name: ${name.trim()}`,
      `Reply Email: ${email.trim()}`,
      `Topic: ${topic}`,
      '',
      notes.trim(),
    ].join('\n');

    const mailtoHref = `mailto:${DEVELOPER_PROFILE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setDraftReady({ mailtoHref, summaryText: `Subject: ${subject}\n\n${body}` });
  };

  const handleCopyDraft = async () => {
    if (!draftReady) return;
    try {
      await navigator.clipboard.writeText(draftReady.summaryText);
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2200);
    } catch {
      setCopiedDraft(false);
    }
  };

  return (
    <PortfolioLayout
      title="CONTACT SIGNAL HOUSE"
      subtitle={`Get in Touch with ${DEVELOPER_PROFILE.name} · ${DEVELOPER_PROFILE.location}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Direct Contact Details & Quick Action Buttons */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E]">
            <div className="flex items-center gap-4">
              <ProfileAvatar size="md" />
              <div>
                <div className="text-xs font-extrabold tracking-wider text-[#EC6D2C]">
                  DIRECT CONTACT
                </div>
                <h2 className="font-display text-4xl font-bold text-[#26211E] leading-none mt-0.5">
                  {DEVELOPER_PROFILE.displayIdentity}
                </h2>
                <p className="text-xs font-bold text-[#61564E] mt-1">
                  {DEVELOPER_PROFILE.role}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E6D3B5] space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Mail className="w-4 h-4 text-[#EC6D2C] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#61564E]">Email</div>
                    <a
                      href={`mailto:${DEVELOPER_PROFILE.email}`}
                      className="font-extrabold text-[#26211E] hover:text-[#EC6D2C] transition-colors break-all"
                    >
                      {DEVELOPER_PROFILE.email}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  aria-label="Copy email address"
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold text-[#26211E] hover:bg-[#E6D3B5] transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#5E915E]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#21968B] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#61564E]">Phone</div>
                  <a
                    href={`tel:${DEVELOPER_PROFILE.phone.replace(/\s+/g, '')}`}
                    className="font-extrabold text-[#26211E] hover:text-[#EC6D2C] transition-colors"
                  >
                    {DEVELOPER_PROFILE.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E65448] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#61564E]">Location</div>
                  <div className="font-extrabold text-[#26211E]">
                    {DEVELOPER_PROFILE.location}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-[#5E915E] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#61564E]">Languages</div>
                  <div className="font-extrabold text-[#26211E]">
                    {DEVELOPER_PROFILE.languages.join(' & ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Required Direct Action Buttons */}
            <div className="mt-5 pt-4 border-t border-[#E6D3B5] grid grid-cols-2 gap-2.5">
              <a
                href={`mailto:${DEVELOPER_PROFILE.email}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </a>
              <a
                href={`tel:${DEVELOPER_PROFILE.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#E6D3B5] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Phone</span>
              </a>
              <a
                href={DEVELOPER_PROFILE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#26211E] text-[#FFF9F0] text-xs font-extrabold hover:opacity-90 transition-opacity"
              >
                <span>Open GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={DEVELOPER_PROFILE.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-90 transition-opacity"
              >
                <span>Open LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Honest Contact Form Interface (No backend delivery yet) */}
        <div className="lg:col-span-7 ui-card p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-[#F5E9D4]/80 border border-[#D9C3A3] flex items-start gap-2.5 text-xs font-bold text-[#26211E]">
            <AlertCircle className="w-4 h-4 text-[#CC5318] shrink-0 mt-0.5" />
            <span>
              <strong>Direct Email Draft Mode:</strong> No automated server mail backend is connected yet. Completing this form prepares a message draft and opens your email client (`mailto:`)—it does not send messages silently behind the scenes.
            </span>
          </div>

          {draftReady ? (
            <div className="space-y-4">
              <h2 className="font-display text-4xl font-bold text-[#21968B]">
                EMAIL DRAFT PREPARED (NOT YET SENT)
              </h2>
              <p className="text-sm font-semibold text-[#61564E]">
                Open your default email app below to send this draft to{' '}
                <span className="font-extrabold text-[#26211E]">{DEVELOPER_PROFILE.email}</span>, or copy the draft text manually.
              </p>

              <pre className="p-4 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3] text-xs font-bold text-[#26211E] whitespace-pre-wrap">
                {draftReady.summaryText}
              </pre>

              <div className="flex flex-wrap gap-3">
                <a
                  href={draftReady.mailtoHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Email App</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold cursor-pointer hover:opacity-90"
                >
                  {copiedDraft ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedDraft ? 'Draft Copied' : 'Copy Draft Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftReady(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold cursor-pointer hover:bg-[#F5E9D4] transition-colors"
                >
                  Edit Draft
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePrepareEmail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-name" className="block text-xs font-extrabold text-[#26211E] mb-1">
                    Name
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:ring-2 focus:ring-[#EC6D2C]/50"
                  />
                </div>
                <div>
                  <label htmlFor="c-email" className="block text-xs font-extrabold text-[#26211E] mb-1">
                    Your Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:ring-2 focus:ring-[#EC6D2C]/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="c-topic" className="block text-xs font-extrabold text-[#26211E] mb-1">
                  Topic
                </label>
                <select
                  id="c-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E]"
                >
                  {SERVICES_LIST.map((srv) => (
                    <option key={srv.id} value={srv.title}>
                      {srv.title} ({srv.tier})
                    </option>
                  ))}
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label htmlFor="c-notes" className="block text-xs font-extrabold text-[#26211E] mb-1">
                  Project Details
                </label>
                <textarea
                  id="c-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your project goals, scope, or questions for Sanjaya Lakshan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] text-sm font-bold text-[#26211E] focus:outline-none focus:ring-2 focus:ring-[#EC6D2C]/50"
                />
              </div>

              {error && <p className="text-xs font-extrabold text-[#E65448]">{error}</p>}

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold hover:bg-[#CC5318] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Prepare Email Draft</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </PortfolioLayout>
  );
};

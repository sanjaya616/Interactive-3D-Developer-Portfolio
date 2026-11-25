import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Compass,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { ProfileAvatar } from '../components/ProfileAvatar';
import {
  DEVELOPER_PROFILE,
  getProjectCounts,
  SKILLS_CATALOG,
} from '../data/portfolioData';

export const AboutPage: React.FC = () => {
  const projectCounts = getProjectCounts();
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.about-stagger',
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  return (
    <PortfolioLayout
      title={DEVELOPER_PROFILE.displayIdentity}
      subtitle={`${DEVELOPER_PROFILE.role} · ${DEVELOPER_PROFILE.location}`}
    >
      <div ref={scopeRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Profile Intro, Biography, Freelance & Personal Interests */}
        <div className="lg:col-span-7 space-y-6">
          <div className="about-stagger ui-card p-6 flex flex-col sm:flex-row gap-5 items-start">
            <ProfileAvatar size="lg" allowUpload />
            <div>
              <div className="text-xs font-extrabold tracking-wider text-[#EC6D2C]">
                DEVELOPER PROFILE
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] mt-0.5 leading-none">
                {DEVELOPER_PROFILE.name}
              </h2>
              <p className="text-sm font-extrabold text-[#26211E] mt-1.5">
                {DEVELOPER_PROFILE.role}
              </p>
              <p className="text-xs font-bold text-[#61564E] mt-1">
                {DEVELOPER_PROFILE.institution}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#61564E]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EC6D2C]" />
                  {DEVELOPER_PROFILE.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#21968B]" />
                  {DEVELOPER_PROFILE.languages.join(' & ')}
                </span>
              </div>
            </div>
          </div>

          <section className="about-stagger space-y-3">
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              BIOGRAPHY
            </h2>
            {DEVELOPER_PROFILE.bio.map((para, i) => (
              <p
                key={i}
                className="text-base font-semibold text-[#61564E] leading-relaxed"
              >
                {para}
              </p>
            ))}
          </section>

          <section className="about-stagger bg-[#F5E9D4]/75 border-2 border-[#26211E] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#CC5318]">
              <Briefcase className="w-4 h-4" />
              <span>FREELANCE BACKGROUND · {DEVELOPER_PROFILE.freelancePeriod}</span>
            </div>
            <p className="text-sm font-bold text-[#26211E] leading-relaxed">
              {DEVELOPER_PROFILE.freelanceSummary}
            </p>
          </section>

          <section className="about-stagger space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#21968B]">
              <Sparkles className="w-4 h-4" />
              <span>EXPLORATION &amp; CRAFT</span>
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              PERSONAL INTERESTS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEVELOPER_PROFILE.personalInterests.map((interest) => (
                <div
                  key={interest}
                  className="px-4 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] text-sm font-extrabold text-[#26211E]"
                >
                  {interest}
                </div>
              ))}
            </div>
          </section>

          <div className="about-stagger pt-2 flex flex-wrap gap-3">
            <Link
              to="/?autostart=1"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold hover:opacity-95 transition-all duration-150 hover:-translate-y-0.5"
            >
              <Compass className="w-4 h-4" />
              <span>Explore 3D World</span>
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold hover:bg-[#CC5318] transition-all duration-150 hover:-translate-y-0.5"
            >
              <span>Explore {projectCounts.total} Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/skills"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F5E9D4] text-[#26211E] border-2 border-[#26211E] text-sm font-extrabold hover:bg-[#E6D3B5] transition-colors duration-150"
            >
              <span>View {SKILLS_CATALOG.length} Skills</span>
            </Link>
          </div>
        </div>

        {/* Right: Verified Credentials & Direct Links */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="about-stagger bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E]">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#61564E]">
              <Building2 className="w-4 h-4 text-[#EC6D2C]" />
              <span>VERIFIED DETAILS</span>
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mt-1">
              OVERVIEW
            </h2>

            <dl className="mt-4 space-y-3 text-sm border-t border-[#E6D3B5] pt-4">
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-[#61564E]">Institution</dt>
                <dd className="font-extrabold text-[#26211E] text-right">
                  {DEVELOPER_PROFILE.institution}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-[#61564E]">Education</dt>
                <dd className="font-extrabold text-[#26211E] tabular-nums">
                  {DEVELOPER_PROFILE.educationPeriod}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-[#61564E]">Freelance Experience</dt>
                <dd className="font-extrabold text-[#26211E] tabular-nums text-right">
                  {DEVELOPER_PROFILE.freelancePeriod}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-[#61564E]">Location</dt>
                <dd className="font-extrabold text-[#26211E] text-right">
                  {DEVELOPER_PROFILE.location}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-[#61564E]">Languages</dt>
                <dd className="font-extrabold text-[#26211E]">
                  {DEVELOPER_PROFILE.languages.join(', ')}
                </dd>
              </div>
            </dl>

            <div className="mt-5 pt-4 border-t border-[#E6D3B5] grid grid-cols-2 gap-3">
              <div className="bg-[#FFF9F0] border border-[#D9C3A3] rounded-xl p-3.5">
                <div className="text-2xl font-extrabold tabular-nums text-[#26211E]">
                  {projectCounts.total}
                </div>
                <div className="text-xs font-bold text-[#61564E]">Documented Projects</div>
              </div>
              <div className="bg-[#FFF9F0] border border-[#D9C3A3] rounded-xl p-3.5">
                <div className="text-2xl font-extrabold tabular-nums text-[#26211E]">
                  {SKILLS_CATALOG.length}
                </div>
                <div className="text-xs font-bold text-[#61564E]">Catalogued Skills</div>
              </div>
            </div>
          </div>

          <div className="about-stagger ui-card p-6 space-y-3">
            <h3 className="font-display text-3xl font-bold text-[#26211E]">
              DIRECT CHANNELS
            </h3>
            <a
              href={`mailto:${DEVELOPER_PROFILE.email}`}
              className="flex items-center gap-2.5 text-sm font-extrabold text-[#26211E] hover:text-[#EC6D2C] transition-colors break-all"
            >
              <Mail className="w-4 h-4 text-[#EC6D2C] shrink-0" />
              <span>{DEVELOPER_PROFILE.email}</span>
            </a>
            <a
              href={`tel:${DEVELOPER_PROFILE.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2.5 text-sm font-extrabold text-[#26211E] hover:text-[#EC6D2C] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#21968B] shrink-0" />
              <span>{DEVELOPER_PROFILE.phone}</span>
            </a>
            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={DEVELOPER_PROFILE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#26211E] text-[#FFF9F0] text-xs font-extrabold hover:opacity-90 transition-opacity"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={DEVELOPER_PROFILE.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-90 transition-opacity"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </PortfolioLayout>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Compass,
  Github,
  GraduationCap,
  Layers,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { ProfileAvatar } from '../components/ProfileAvatar';
import {
  DEVELOPER_PROFILE,
  JOURNEY_MILESTONES,
  PORTFOLIO_PROJECTS,
  SERVICES_LIST,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
} from '../data/portfolioData';

export const ClassicPortfolioPage: React.FC = () => {
  return (
    <PortfolioLayout
      title="CLASSIC PORTFOLIO"
      subtitle="Keyboard-Accessible Single-Page Mode · No 3D Driving Required"
    >
      {/* Quick Section Jump Navigation */}
      <nav
        aria-label="Classic portfolio sections"
        className="mb-8 p-4 rounded-2xl bg-[#F5E9D4] border-2 border-[#26211E] flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-extrabold">
          <a
            href="#classic-about"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            About
          </a>
          <a
            href="#classic-projects"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            Projects ({PORTFOLIO_PROJECTS.length})
          </a>
          <a
            href="#classic-skills"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            Skills ({SKILLS_CATALOG.length})
          </a>
          <a
            href="#classic-journey"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            Journey
          </a>
          <a
            href="#classic-services"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            Services ({SERVICES_LIST.length})
          </a>
          <a
            href="#classic-contact"
            className="px-3 py-1.5 rounded-lg bg-[#FFF9F0] border border-[#26211E] hover:bg-[#E6D3B5] transition-colors"
          >
            Contact
          </a>
        </div>

        <Link
          to="/?autostart=1"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#21968B] text-[#FFF9F0] border border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Drive 3D World</span>
        </Link>
      </nav>

      {/* 1. Profile & Biography */}
      <section
        id="classic-about"
        aria-labelledby="classic-about-heading"
        className="ui-card p-6 sm:p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <ProfileAvatar size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold tracking-wider text-[#EC6D2C]">
              ACCESSIBLE PORTFOLIO OVERVIEW
            </div>
            <h2
              id="classic-about-heading"
              className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] mt-1 leading-none"
            >
              {DEVELOPER_PROFILE.displayIdentity}
            </h2>
            <p className="text-base font-extrabold text-[#21968B] mt-1">
              {DEVELOPER_PROFILE.role} · {DEVELOPER_PROFILE.institution}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm font-bold text-[#61564E]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#EC6D2C]" />
                {DEVELOPER_PROFILE.location}
              </span>
              <span>Education: {DEVELOPER_PROFILE.educationPeriod}</span>
              <span>Freelance: {DEVELOPER_PROFILE.freelancePeriod}</span>
              <span>Languages: {DEVELOPER_PROFILE.languages.join(' & ')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm sm:text-base font-semibold text-[#26211E] leading-relaxed">
          {DEVELOPER_PROFILE.bio.map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-[#E6D3B5]">
          <div className="text-xs font-extrabold text-[#61564E] mb-2">
            AREAS OF INTEREST
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            {DEVELOPER_PROFILE.personalInterests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] text-xs font-extrabold text-[#26211E]"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. All 11 Projects */}
      <section
        id="classic-projects"
        aria-labelledby="classic-projects-heading"
        className="mt-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-extrabold text-[#E65448] flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>COMPLETE PROJECT ARCHIVE</span>
            </div>
            <h2
              id="classic-projects-heading"
              className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] leading-none mt-1"
            >
              PROJECTS ({PORTFOLIO_PROJECTS.length})
            </h2>
          </div>
          <Link
            to="/projects"
            className="text-xs sm:text-sm font-extrabold text-[#EC6D2C] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Filterable Gallery</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PORTFOLIO_PROJECTS.map((project) => (
            <article
              key={project.slug}
              className="ui-card-interactive p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="text-[#61564E]">
                    {project.number} · {project.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F5E9D4] border border-[#D9C3A3] text-[#26211E]">
                    {project.status}
                  </span>
                </div>
                <h3 className="font-display text-3xl font-bold text-[#26211E] mt-1.5 leading-tight">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[#61564E] leading-relaxed">
                  {project.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded bg-[#F5E9D4] text-[11px] font-bold text-[#26211E]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E6D3B5] flex items-center justify-between">
                <span className="text-xs font-bold text-[#61564E] tabular-nums">
                  {project.implementedFeatures.length} implemented · {project.plannedFeatures.length} planned
                </span>
                <Link
                  to={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#EC6D2C] hover:underline"
                >
                  <span>Full Details</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. All 24 Skills */}
      <section
        id="classic-skills"
        aria-labelledby="classic-skills-heading"
        className="mt-10 ui-card p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-extrabold text-[#21968B] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>TECHNICAL STACK</span>
            </div>
            <h2
              id="classic-skills-heading"
              className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] leading-none mt-1"
            >
              SKILLS &amp; TOOLS ({SKILLS_CATALOG.length})
            </h2>
          </div>
          <Link
            to="/skills"
            className="text-xs sm:text-sm font-extrabold text-[#21968B] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Workshop View</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-5">
          {SKILL_CATEGORIES.map((category) => {
            const items = SKILLS_CATALOG.filter((s) => s.category === category);
            return (
              <div key={category}>
                <h3 className="text-sm font-extrabold text-[#26211E] mb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {items.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3 rounded-xl bg-[#F5E9D4]/70 border border-[#D9C3A3]"
                    >
                      <div className="text-sm font-extrabold text-[#26211E]">{skill.name}</div>
                      <div className="text-xs font-semibold text-[#61564E] mt-0.5">
                        {skill.shortDescription}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Journey & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        <section
          id="classic-journey"
          aria-labelledby="classic-journey-heading"
          className="ui-card p-6"
        >
          <div className="text-xs font-extrabold text-[#5E915E] flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" />
            <span>EDUCATION &amp; EXPERIENCE</span>
          </div>
          <h2
            id="classic-journey-heading"
            className="font-display text-4xl font-bold text-[#26211E] leading-none mt-1 mb-4"
          >
            JOURNEY
          </h2>
          <ol className="space-y-4">
            {JOURNEY_MILESTONES.map((m) => (
              <li key={m.id} className="p-3.5 rounded-xl bg-[#F5E9D4]/65 border border-[#D9C3A3]">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#61564E]">
                  <span>{m.organization}</span>
                  <span>{m.period}</span>
                </div>
                <div className="text-base font-extrabold text-[#26211E] mt-0.5">{m.title}</div>
                <p className="text-xs sm:text-sm font-semibold text-[#61564E] mt-1 leading-relaxed">
                  {m.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="classic-services"
          aria-labelledby="classic-services-heading"
          className="ui-card p-6"
        >
          <div className="text-xs font-extrabold text-[#EC6D2C] flex items-center gap-1.5">
            <Wrench className="w-4 h-4" />
            <span>WHAT I BUILD</span>
          </div>
          <h2
            id="classic-services-heading"
            className="font-display text-4xl font-bold text-[#26211E] leading-none mt-1 mb-4"
          >
            SERVICES ({SERVICES_LIST.length})
          </h2>
          <div className="space-y-3">
            {SERVICES_LIST.map((srv) => (
              <div key={srv.id} className="p-3.5 rounded-xl bg-[#F5E9D4]/65 border border-[#D9C3A3]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-base font-extrabold text-[#26211E]">
                    {srv.number}. {srv.title}
                  </div>
                  <span className="text-[11px] font-extrabold text-[#61564E]">{srv.tier}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#61564E] mt-1 leading-relaxed">
                  {srv.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 5. Direct Contact */}
      <section
        id="classic-contact"
        aria-labelledby="classic-contact-heading"
        className="mt-10 bg-[#26211E] text-[#FFF9F0] border-2 border-[#26211E] rounded-2xl p-6 sm:p-8 shadow-[0_6px_0_#61564E]"
      >
        <h2
          id="classic-contact-heading"
          className="font-display text-4xl sm:text-5xl font-bold leading-none"
        >
          DIRECT CONTACT
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#F5E9D4]">
          Available for freelance web development, database design, and custom software projects.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href={`mailto:${DEVELOPER_PROFILE.email}`}
            className="p-3.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#EC6D2C] font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#F5E9D4] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#EC6D2C] shrink-0" />
            <span className="truncate">{DEVELOPER_PROFILE.email}</span>
          </a>

          <a
            href={`tel:${DEVELOPER_PROFILE.phone.replace(/\s+/g, '')}`}
            className="p-3.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#21968B] font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#F5E9D4] transition-colors"
          >
            <Phone className="w-4 h-4 text-[#21968B] shrink-0" />
            <span>{DEVELOPER_PROFILE.phone}</span>
          </a>

          <a
            href={DEVELOPER_PROFILE.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#26211E] font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#F5E9D4] transition-colors"
          >
            <Github className="w-4 h-4 shrink-0" />
            <span>GitHub Profile</span>
          </a>

          <a
            href={DEVELOPER_PROFILE.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#26211E] font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#F5E9D4] transition-colors"
          >
            <Linkedin className="w-4 h-4 text-[#3E7B9E] shrink-0" />
            <span>LinkedIn Profile</span>
          </a>
        </div>
      </section>
    </PortfolioLayout>
  );
};

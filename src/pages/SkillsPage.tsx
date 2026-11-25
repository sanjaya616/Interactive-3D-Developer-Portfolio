import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { SkillSymbol } from '../components/SkillSymbol';
import {
  PORTFOLIO_PROJECTS,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
} from '../data/portfolioData';
import { SKILL_ORB_LINKS } from '../game/progression';
import { useAppState } from '../state/AppStateContext';
import type { SkillCategoryName, SkillItem } from '../types/portfolio';

const CATEGORY_DOT: Record<SkillCategoryName, string> = {
  Frontend: 'bg-[#EC6D2C]',
  'Backend and Databases': 'bg-[#3E7B9E]',
  'Mobile and Games': 'bg-[#21968B]',
  'Creative Work': 'bg-[#E65448]',
  'Tools and Workflow': 'bg-[#5E915E]',
};

export const SkillsPage: React.FC = () => {
  const { collectedIds } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSkill, setSelectedSkill] = useState<SkillItem>(SKILLS_CATALOG[0]);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  const collectedOrbCount = SKILL_ORB_LINKS.filter((o) =>
    collectedIds.includes(o.orbId),
  ).length;

  const visibleSkills = useMemo(() => {
    if (selectedCategory === 'All') return SKILLS_CATALOG;
    return SKILLS_CATALOG.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.skill-card-anim',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out', clearProps: 'transform' },
      );
    }, cardsRef);
    return () => ctx.revert();
  }, [selectedCategory]);

  const matchingProjects = useMemo(() => {
    const key = selectedSkill.name.toLowerCase();
    return PORTFOLIO_PROJECTS.filter((proj) =>
      proj.technologies.some((t) => {
        const tl = t.toLowerCase();
        return (
          key.includes(tl) ||
          tl.includes(key.split(' ')[0]) ||
          (selectedSkill.id === 'sql' && tl.includes('sql')) ||
          (selectedSkill.id === 'mobile-app-dev' &&
            (tl.includes('kotlin') || tl.includes('flutter'))) ||
          (selectedSkill.id === 'c-programming' && tl.includes('c/c++'))
        );
      }),
    );
  }, [selectedSkill]);

  return (
    <PortfolioLayout
      title="SKILLS WORKSHOP"
      subtitle={`${SKILLS_CATALOG.length} Skills across ${SKILL_CATEGORIES.length} Categories · Click Any Card to Inspect`}
    >
      {/* Skill Orbs Mastery Strip */}
      <section className="ui-card-sand p-4 sm:p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#21968B]">
            <Sparkles className="w-4 h-4" />
            <span>WORLD SKILL ORBS MASTERY · {collectedOrbCount}/{SKILL_ORB_LINKS.length} COLLECTED</span>
          </div>
          <Link
            to="/?autostart=1"
            className="ui-btn ui-btn-accent px-3.5 py-1.5 text-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Hunt Orbs in 3D World</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {SKILL_ORB_LINKS.map((orb) => {
            const collected = collectedIds.includes(orb.orbId);
            return (
              <div
                key={orb.orbId}
                title={collected ? orb.skillNames.join(', ') : orb.hint}
                className={`p-2 rounded-xl border text-[11px] transition-colors ${
                  collected
                    ? 'bg-[#FFF9F0] border-[#21968B] text-[#26211E]'
                    : 'bg-[#FFF9F0]/60 border-[#D9C3A3] text-[#61564E]'
                }`}
              >
                <div className="font-extrabold truncate">{orb.techFocus.split(' ')[0]}</div>
                <div className={`text-[10px] font-bold ${collected ? 'text-[#5E915E]' : 'text-[#61564E]'}`}>
                  {collected ? 'Collected ✓' : 'Hidden'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5 Filterable Skill Categories */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          type="button"
          aria-pressed={selectedCategory === 'All'}
          onClick={() => setSelectedCategory('All')}
          className="ui-filter-chip"
        >
          All ({SKILLS_CATALOG.length})
        </button>

        {SKILL_CATEGORIES.map((cat) => {
          const count = SKILLS_CATALOG.filter((s) => s.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className="ui-filter-chip whitespace-nowrap"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[cat]}`}
                aria-hidden="true"
              />
              <span>{cat} ({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Skill Cards Grid */}
        <div ref={cardsRef} className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleSkills.map((skill) => {
            const active = selectedSkill.id === skill.id;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedSkill(skill)}
                className={`skill-card-anim text-left p-4 flex items-start gap-3.5 cursor-pointer ${
                  active
                    ? 'ui-card-featured bg-[#F5E9D4]! -translate-y-0.5'
                    : 'ui-card-interactive'
                }`}
              >
                <SkillSymbol
                  symbolKey={skill.symbolKey}
                  accentColor={skill.accentColor}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold text-[#61564E]">
                    {skill.category}
                  </div>
                  <h2 className="text-base font-extrabold text-[#26211E] mt-0.5">
                    {skill.name}
                  </h2>
                  <p className="text-xs font-semibold text-[#61564E] mt-1 leading-relaxed">
                    {skill.shortDescription}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Skill Detail Inspector */}
        <aside
          data-testid="skill-detail-panel"
          className="lg:col-span-4 ui-card-featured bg-[#F5E9D4]! p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-center gap-3.5">
            <SkillSymbol
              symbolKey={selectedSkill.symbolKey}
              accentColor={selectedSkill.accentColor}
            />
            <div>
              <div className="text-xs font-extrabold text-[#61564E]">
                {selectedSkill.category.toUpperCase()}
              </div>
              <h2 className="font-display text-4xl font-bold text-[#26211E] leading-none mt-0.5">
                {selectedSkill.name}
              </h2>
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-[#26211E] leading-relaxed">
            {selectedSkill.shortDescription}
          </p>
          <p className="mt-2.5 text-sm font-semibold text-[#61564E] leading-relaxed">
            {selectedSkill.detailDescription}
          </p>

          <div className="mt-5 pt-4 border-t ui-divider">
            <div className="text-xs font-extrabold text-[#61564E] mb-2">
              APPLIED IN PROJECTS ({matchingProjects.length})
            </div>
            {matchingProjects.length > 0 ? (
              <div className="space-y-2">
                {matchingProjects.map((proj) => (
                  <Link
                    key={proj.slug}
                    to={`/projects/${proj.slug}`}
                    className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] hover:border-[#26211E] text-xs font-extrabold text-[#26211E] hover:bg-[#F5E9D4] transition-colors flex items-center justify-between gap-2"
                  >
                    <span>
                      {proj.number}. {proj.title}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#EC6D2C] shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#61564E]">
                Practiced in ongoing studio exploration and coursework foundations.
              </p>
            )}
          </div>
        </aside>
      </div>
    </PortfolioLayout>
  );
};

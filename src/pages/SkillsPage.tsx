import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { SkillSymbol } from '../components/SkillSymbol';
import {
  PORTFOLIO_PROJECTS,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
} from '../data/portfolioData';
import type { SkillItem } from '../types/portfolio';

export const SkillsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSkill, setSelectedSkill] = useState<SkillItem>(SKILLS_CATALOG[0]);
  const cardsRef = useRef<HTMLDivElement | null>(null);

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
      {/* 5 Filterable Skill Categories */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          type="button"
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 border-[#26211E] transition-colors duration-150 cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-[#26211E] text-[#FFF9F0]'
              : 'bg-[#F5E9D4] text-[#26211E] hover:bg-[#E6D3B5]'
          }`}
        >
          All ({SKILLS_CATALOG.length})
        </button>

        {SKILL_CATEGORIES.map((cat) => {
          const count = SKILLS_CATALOG.filter((s) => s.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 border-[#26211E] transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#26211E] text-[#FFF9F0]'
                  : 'bg-[#F5E9D4] text-[#26211E] hover:bg-[#E6D3B5]'
              }`}
            >
              {cat} ({count})
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
                className={`skill-card-anim text-left rounded-2xl p-4 border-2 border-[#26211E] transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                  active
                    ? 'bg-[#F5E9D4] shadow-[0_5px_0_#26211E] -translate-y-0.5'
                    : 'bg-[#FFF9F0] shadow-[0_3px_0_#26211E] hover:bg-[#F5E9D4]/55 hover:-translate-y-0.5'
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
          className="lg:col-span-4 bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_6px_0_#26211E] lg:sticky lg:top-24"
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

          <div className="mt-5 pt-4 border-t border-[#E6D3B5]">
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

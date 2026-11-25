import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, RotateCcw, Search } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { ProjectPreviewArt } from '../components/ProjectPreviewArt';
import { getProjectCounts, PORTFOLIO_PROJECTS } from '../data/portfolioData';

const STATUS_FILTERS = [
  'All',
  'Personal project',
  'Client work',
  'In development',
  'Coursework',
  'Hardware & Prototypes',
] as const;

export const ProjectsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const gridRef = useRef<HTMLDivElement | null>(null);
  const counts = useMemo(() => getProjectCounts(), []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(PORTFOLIO_PROJECTS.map((p) => p.category)))],
    [],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PORTFOLIO_PROJECTS.filter((project) => {
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Hardware & Prototypes'
            ? project.status === 'Prototype / Design' || project.status === 'Electronics prototype'
            : project.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'All' || project.category === categoryFilter;

      const matchesSearch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.category.toLowerCase().includes(q) ||
        project.technologies.some((t) => t.toLowerCase().includes(q));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.project-card-item',
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }, gridRef);
    return () => ctx.revert();
  }, [filtered]);

  const showSpotlight =
    !searchQuery.trim() && categoryFilter === 'All' && statusFilter === 'All';
  const spotlightProject =
    PORTFOLIO_PROJECTS.find((p) => p.slug === 'smartmove-transport-solutions') ||
    PORTFOLIO_PROJECTS[0];

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
  };

  return (
    <PortfolioLayout
      title="PROJECTS EXHIBITION"
      subtitle={`${counts.total} Builds · Web, Mobile, Coursework & Hardware Prototypes`}
    >
      {/* Search + Category + Status Controls */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 relative">
            <label htmlFor="project-search" className="sr-only">
              Search projects by title, category, or technology
            </label>
            <Search className="w-4 h-4 text-[#61564E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="project-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title, technology (PHP, MySQL, Kotlin, Arduino)..."
              className="ui-input pl-10 pr-4 py-2.5"
            />
          </div>

          <div className="md:col-span-5">
            <label htmlFor="project-category-filter" className="sr-only">
              Filter by project category
            </label>
            <select
              id="project-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ui-select bg-[#F5E9D4] font-extrabold py-2.5 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : `Category: ${cat}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={statusFilter === tab}
              onClick={() => setStatusFilter(tab)}
              className="ui-filter-chip whitespace-nowrap"
            >
              {tab}
              {tab === 'All' ? ` (${counts.total})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Spotlight Build */}
      {showSpotlight && (
        <section
          aria-label="Featured Project Spotlight"
          className="mb-8 ui-card-featured bg-[#F5E9D4]/85! p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        >
          <div className="lg:col-span-5">
            <ProjectPreviewArt
              kind={spotlightProject.previewKind}
              accentColor={spotlightProject.accentColor}
              title={spotlightProject.title}
            />
          </div>
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
              <span className="text-[#EC6D2C] tracking-wider">
                FEATURED SPOTLIGHT · PROJECT {spotlightProject.number}
              </span>
              <span className="text-[#61564E]">·</span>
              <span className="text-[#21968B]">{spotlightProject.status}</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] leading-[0.96]">
              {spotlightProject.title}
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
              {spotlightProject.description}
            </p>
            <div className="text-xs font-extrabold text-[#26211E]">
              {spotlightProject.technologies.join(' · ')}
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#61564E] tabular-nums">
                {spotlightProject.implementedFeatures.length} implemented · {spotlightProject.plannedFeatures.length} planned
              </span>
              <Link
                to={`/projects/${spotlightProject.slug}`}
                className="ui-btn ui-btn-primary px-5 py-2.5 text-xs"
              >
                <span>Open Case Study</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <div className="ui-card-sand p-8 text-center">
          <h2 className="font-display text-4xl font-bold text-[#26211E]">
            NO MATCHING PROJECTS
          </h2>
          <p className="mt-2 text-sm font-semibold text-[#61564E]">
            Try clearing your search term or switching category and status filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 ui-btn ui-btn-primary px-4 py-2.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((project) => (
            <article
              key={project.slug}
              className="project-card-item ui-card-interactive p-5 sm:p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <ProjectPreviewArt
                  kind={project.previewKind}
                  accentColor={project.accentColor}
                  title={project.title}
                />

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
                    <span className="text-[#61564E]">
                      PROJECT {project.number} · {project.category.toUpperCase()}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-md border border-[#26211E]/35 text-[#FFF9F0]"
                      style={{ backgroundColor: project.accentColor }}
                    >
                      {project.status}
                    </span>
                  </div>

                  <h2 className="font-display text-4xl font-bold text-[#26211E] mt-2 leading-tight">
                    {project.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-[#61564E] leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="pt-3 border-t ui-divider text-xs font-extrabold text-[#26211E] leading-relaxed">
                  <span className="text-[#61564E] font-bold mr-1.5">Stack:</span>
                  {project.technologies.join(' · ')}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-xs font-bold text-[#61564E] tabular-nums">
                  {project.implementedFeatures.length} implemented
                  {project.plannedFeatures.length > 0
                    ? ` · ${project.plannedFeatures.length} planned`
                    : ''}
                </div>

                <Link
                  to={`/projects/${project.slug}`}
                  className="ui-btn ui-btn-primary px-4 py-2 text-xs shrink-0"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </PortfolioLayout>
  );
};

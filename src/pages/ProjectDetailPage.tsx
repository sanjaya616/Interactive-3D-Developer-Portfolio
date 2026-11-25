import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderGit2,
} from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { ProjectPreviewArt } from '../components/ProjectPreviewArt';
import { PORTFOLIO_PROJECTS } from '../data/portfolioData';
import { useAppState } from '../state/AppStateContext';

export const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { openedProjects, markProjectOpened } = useAppState();
  const index = PORTFOLIO_PROJECTS.findIndex((p) => p.slug === slug);
  const project = index >= 0 ? PORTFOLIO_PROJECTS[index] : undefined;

  useEffect(() => {
    if (project) {
      markProjectOpened(project.slug);
    }
  }, [project, markProjectOpened]);

  if (!project) {
    return (
      <PortfolioLayout title="PROJECT NOT FOUND" subtitle="Projects Exhibition">
        <p className="text-base font-semibold text-[#61564E]">
          That project slug does not exist in the centralized catalog.
        </p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5E9D4] border-2 border-[#26211E] text-sm font-extrabold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Projects</span>
        </Link>
      </PortfolioLayout>
    );
  }

  const prevProject =
    PORTFOLIO_PROJECTS[(index - 1 + PORTFOLIO_PROJECTS.length) % PORTFOLIO_PROJECTS.length];
  const nextProject = PORTFOLIO_PROJECTS[(index + 1) % PORTFOLIO_PROJECTS.length];

  return (
    <PortfolioLayout
      title={project.title.toUpperCase()}
      subtitle={`Project ${project.number} · ${project.category} · Status: ${project.status}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm font-extrabold text-[#26211E] hover:text-[#EC6D2C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        <span className="px-3 py-1 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] text-xs font-extrabold text-[#26211E] tabular-nums">
          Project Explorer: {openedProjects.length} / {PORTFOLIO_PROJECTS.length} Opened
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <ProjectPreviewArt
            kind={project.previewKind}
            accentColor={project.accentColor}
            title={project.title}
          />

          <p className="text-lg font-extrabold text-[#26211E] leading-relaxed">
            {project.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Implemented Features */}
            <section className="ui-card p-5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#5E915E]">
                <CheckCircle2 className="w-4 h-4" />
                <span>IMPLEMENTED FEATURES ({project.implementedFeatures.length})</span>
              </div>
              <ul className="mt-3 space-y-2">
                {project.implementedFeatures.map((feat) => (
                  <li
                    key={feat}
                    className="text-sm font-bold text-[#26211E] flex items-start gap-2"
                  >
                    <span className="text-[#5E915E]" aria-hidden="true">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Planned Features — explicitly separated */}
            <section className="ui-card-sand p-5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#CC5318]">
                <Clock className="w-4 h-4" />
                <span>PLANNED FEATURES ({project.plannedFeatures.length})</span>
              </div>
              {project.plannedFeatures.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {project.plannedFeatures.map((feat) => (
                    <li
                      key={feat}
                      className="text-sm font-bold text-[#61564E] flex items-start gap-2"
                    >
                      <span className="text-[#CC5318]" aria-hidden="true">○</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm font-semibold text-[#61564E]">
                  Delivered scope focused on core client requirements.
                </p>
              )}
            </section>
          </div>

          <section className="ui-card p-5">
            <h2 className="font-display text-3xl font-bold text-[#26211E]">
              MY CONTRIBUTION
            </h2>
            <p className="mt-2 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
              {project.contribution}
            </p>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-5">
          <div className="ui-card-featured bg-[#F5E9D4]! p-5">
            <h2 className="font-display text-3xl font-bold text-[#26211E]">
              PROJECT STATUS
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2 pb-2 border-b ui-divider">
                <dt className="font-bold text-[#61564E]">Category</dt>
                <dd className="font-extrabold text-[#26211E] text-right">{project.category}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-bold text-[#61564E]">Current Status</dt>
                <dd
                  className="px-2.5 py-0.5 rounded-md border border-[#26211E]/35 text-xs font-extrabold text-[#FFF9F0]"
                  style={{ backgroundColor: project.accentColor }}
                >
                  {project.status}
                </dd>
              </div>
            </dl>
          </div>

          <div className="ui-card p-5">
            <h2 className="font-display text-3xl font-bold text-[#26211E]">
              TECHNOLOGIES
            </h2>
            <p className="mt-2.5 text-sm font-extrabold text-[#26211E] leading-relaxed">
              {project.technologies.join(' · ')}
            </p>
          </div>

          {/* Editable Verified Links Panel (No fabricated URLs) */}
          <div className="ui-card p-5">
            <h2 className="font-display text-3xl font-bold text-[#26211E]">
              PROJECT LINKS
            </h2>
            <div className="mt-3 space-y-3 text-xs font-semibold text-[#61564E]">
              {project.links.liveUrl ? (
                <a
                  href={project.links.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full ui-btn ui-btn-primary px-3.5 py-2.5 justify-between"
                >
                  <span>Visit Live Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3 ui-card-sand">
                  <div className="font-extrabold text-[#26211E]">Live Demo</div>
                  <div className="mt-0.5">{project.links.livePlaceholder}</div>
                </div>
              )}

              {project.links.repoUrl ? (
                <a
                  href={project.links.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full ui-btn ui-btn-dark px-3.5 py-2.5 justify-between"
                >
                  <span>View Source Repository</span>
                  <FolderGit2 className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3 ui-card-sand">
                  <div className="font-extrabold text-[#26211E]">Repository</div>
                  <div className="mt-0.5">{project.links.repoPlaceholder}</div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Previous & Next Project Navigation */}
      <nav
        aria-label="Project sequence navigation"
        className="mt-10 pt-8 border-t-2 border-[#E6D3B5] grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link
          to={`/projects/${prevProject.slug}`}
          className="ui-card-interactive p-4 flex items-center gap-3"
        >
          <ArrowLeft className="w-5 h-5 text-[#EC6D2C] shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold text-[#61564E]">
              PREVIOUS · PROJECT {prevProject.number}
            </div>
            <div className="text-sm font-extrabold text-[#26211E] truncate">
              {prevProject.title}
            </div>
          </div>
        </Link>

        <Link
          to={`/projects/${nextProject.slug}`}
          className="ui-card-interactive p-4 flex items-center justify-between gap-3 text-right sm:text-right"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-[#61564E]">
              NEXT · PROJECT {nextProject.number}
            </div>
            <div className="text-sm font-extrabold text-[#26211E] truncate">
              {nextProject.title}
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#21968B] shrink-0" />
        </Link>
      </nav>
    </PortfolioLayout>
  );
};

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, Mail } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { SERVICES_LIST } from '../data/portfolioData';

export const ServicesPage: React.FC = () => {
  const established = SERVICES_LIST.filter((s) => s.tier === 'Established Service');
  const exploratory = SERVICES_LIST.filter((s) => s.tier === 'Exploratory Area');
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.service-card-anim',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'transform' },
      );
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  return (
    <PortfolioLayout
      title="SERVICES & EXPLORATION"
      subtitle="Delivery Depot · Established Development Services & Exploratory Craft"
    >
      <div ref={scopeRef} className="space-y-12">
        {/* Established Development Services */}
        <section>
          <div className="mb-5">
            <div className="text-xs font-extrabold tracking-wider text-[#21968B]">
              CORE PRACTICE · CLIENT &amp; FREELANCE READY
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mt-0.5">
              ESTABLISHED DEVELOPMENT SERVICES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {established.map((srv) => (
              <article
                key={srv.id}
                className="service-card-anim ui-card-interactive p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                    <span className="text-[#EC6D2C]">{srv.number}. SERVICE</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#21968B] text-[#FFF9F0] border border-[#26211E]">
                      {srv.tier}
                    </span>
                  </div>
                  <h3 className="font-display text-4xl font-bold text-[#26211E] mt-2">
                    {srv.title}
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-[#61564E] leading-relaxed">
                    {srv.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {srv.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-[#F5E9D4] border border-[#D9C3A3] text-[11px] font-extrabold text-[#26211E]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 pt-4 border-t border-[#E6D3B5] space-y-2">
                    {srv.focusAreas.map((d) => (
                      <li key={d} className="text-xs sm:text-sm font-bold text-[#26211E]">
                        • {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={`/contact?topic=${encodeURIComponent(srv.title)}`}
                  className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_2px_0_#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors duration-150"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Me</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Exploratory Areas */}
        <section>
          <div className="mb-5">
            <div className="text-xs font-extrabold tracking-wider text-[#61564E]">
              ONGOING R&amp;D · PROTOTYPING &amp; CREATIVE CRAFT
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mt-0.5">
              EXPLORATORY AREAS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exploratory.map((srv) => (
              <article
                key={srv.id}
                className="service-card-anim bg-[#F5E9D4]/75 border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_5px_0_#26211E] flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                    <span className="text-[#61564E]">{srv.number}. AREA</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FFF9F0] text-[#26211E] border border-[#D9C3A3]">
                      {srv.tier}
                    </span>
                  </div>
                  <h3 className="font-display text-4xl font-bold text-[#26211E] mt-2">
                    {srv.title}
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-[#61564E] leading-relaxed">
                    {srv.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {srv.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-[#FFF9F0] border border-[#D9C3A3] text-[11px] font-extrabold text-[#26211E]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 pt-4 border-t border-[#E6D3B5] space-y-2">
                    {srv.focusAreas.map((d) => (
                      <li key={d} className="text-xs sm:text-sm font-bold text-[#26211E]">
                        • {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    to={`/contact?topic=${encodeURIComponent(srv.title)}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#26211E] text-[#FFF9F0] text-xs font-extrabold hover:opacity-90 transition-opacity"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Me</span>
                  </Link>
                  <Link
                    to="/projects"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] text-[#26211E] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#E6D3B5] transition-colors"
                  >
                    <span>Prototypes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PortfolioLayout>
  );
};

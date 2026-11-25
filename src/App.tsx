import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavigationDrawer } from './components/NavigationDrawer';
import { PortfolioGuideAssistant } from './components/PortfolioGuideAssistant';
import { AppStateProvider } from './state/AppStateContext';
import { WorldPage } from './pages/WorldPage';

const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
);
const SkillsPage = lazy(() =>
  import('./pages/SkillsPage').then((m) => ({ default: m.SkillsPage })),
);
const JourneyPage = lazy(() =>
  import('./pages/JourneyPage').then((m) => ({ default: m.JourneyPage })),
);
const ServicesPage = lazy(() =>
  import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const AchievementsPage = lazy(() =>
  import('./pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })),
);
const GaragePage = lazy(() =>
  import('./pages/GaragePage').then((m) => ({ default: m.GaragePage })),
);
const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const WhispersPage = lazy(() =>
  import('./pages/WhispersPage').then((m) => ({ default: m.WhispersPage })),
);
const GuidePage = lazy(() =>
  import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })),
);
const BehindTheScenesPage = lazy(() =>
  import('./pages/BehindTheScenesPage').then((m) => ({ default: m.BehindTheScenesPage })),
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
);
const ClassicPortfolioPage = lazy(() =>
  import('./pages/ClassicPortfolioPage').then((m) => ({ default: m.ClassicPortfolioPage })),
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center text-sm font-extrabold text-[#61564E]">
      Loading page...
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <BrowserRouter>
          <NavigationDrawer />
          <PortfolioGuideAssistant />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<WorldPage />} />
              <Route path="/classic" element={<ClassicPortfolioPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:slug" element={<ProjectDetailPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/journey" element={<JourneyPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/garage" element={<GaragePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/whispers" element={<WhispersPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/behind-the-scenes" element={<BehindTheScenesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppStateProvider>
    </ErrorBoundary>
  );
}

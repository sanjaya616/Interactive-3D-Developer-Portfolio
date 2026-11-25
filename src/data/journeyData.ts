import type { JourneyMilestone } from '../types/portfolio.ts';

/**
 * Exact 5 Education and Experience milestones for Sanjaya Lakshan.
 * Do not invent missing examination years.
 */
export const JOURNEY_MILESTONES: JourneyMilestone[] = [
  {
    id: 'ol-sri-lanka',
    title: 'Ordinary Level (O/L)',
    organization: 'Sri Lanka National Curriculum',
    period: 'Completed',
    statusLabel: 'Completed',
    type: 'Education',
    location: 'Sri Lanka',
    description:
      'Completed G.C.E. Ordinary Level examinations in Sri Lanka, establishing core foundations in mathematics, science, and analytical problem solving.',
  },
  {
    id: 'al-sri-lanka',
    title: 'Advanced Level (A/L)',
    organization: 'Sri Lanka National Curriculum',
    period: 'Completed',
    statusLabel: 'Completed',
    type: 'Education',
    location: 'Sri Lanka',
    description:
      'Completed G.C.E. Advanced Level studies in Sri Lanka, preparing for undergraduate software engineering and computing craft.',
  },
  {
    id: 'freelance-dev',
    title: 'Freelance Software Developer',
    organization: 'Independent Client Practice',
    period: '2023 – Present',
    statusLabel: 'Active practice',
    type: 'Experience',
    location: 'Anuradhapura, Sri Lanka · Local & International Clients',
    description:
      'Building practical web applications, retail storefronts, e-commerce setups, and small-business stock management tools for local and international clients.',
  },
  {
    id: 'nibm-se',
    title: 'Software Engineering Studies',
    organization: 'NIBM – National Institute of Business Management',
    period: '2024 – Present',
    statusLabel: 'In progress',
    type: 'Education',
    location: 'Sri Lanka',
    description:
      'Studying Software Engineering at NIBM, building structured foundations in relational databases, Oracle PL/SQL, NoSQL telemetry, full-stack web architecture, and systems design.',
  },
  {
    id: 'continuing-craft',
    title: 'Continuing Exploration and Craft',
    organization: 'Independent R&D & Prototypes',
    period: 'Present',
    statusLabel: 'Ongoing focus',
    type: 'Exploration',
    location: 'Anuradhapura, Sri Lanka',
    description:
      'Ongoing focus on mobile applications (Kotlin Android & Flutter), interactive game development, UI design, photo and video editing, and Arduino electronics prototypes.',
  },
];

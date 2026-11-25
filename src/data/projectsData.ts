import type { PortfolioProject } from '../types/portfolio.ts';

/**
 * Centralized project data for Sanjaya Lakshan.
 * Updating any entry here automatically updates Project Cards, Project Details,
 * 3D Project Pavilion exhibition highlights, and computed portfolio statistics.
 */
export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    number: '01',
    slug: 'learning-management-system',
    title: 'Learning Management System',
    category: 'Web Application',
    status: 'Personal project',
    technologies: ['PHP', 'MySQL', 'JavaScript', 'HTML5', 'CSS3'],
    description:
      'A structured educational portal for course administration, student enrollment, lesson delivery and administration.',
    implementedFeatures: [
      'Course catalog',
      'Student enrollment',
      'Instructor and student roles',
      'Course material uploads',
      'Relational database',
    ],
    plannedFeatures: [
      'Quiz grading',
      'Progress certificates',
      'Discussion threads',
    ],
    contribution:
      'Designed the relational MySQL schema, built role-based instructor and student access flows, and implemented course enrollment and material upload pages.',
    previewKind: 'lms',
    accentColor: '#F27D3B',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Verified live URL not attached yet (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Verified repository URL not attached yet (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '02',
    slug: 'hotel-booking-system',
    title: 'Hotel Booking System',
    category: 'Reservation Platform',
    status: 'Personal project',
    technologies: ['PHP', 'SQL', 'CSS3', 'JavaScript'],
    description:
      'Room reservation platform with room categories, date selection and administrative booking management.',
    implementedFeatures: [
      'Room categories',
      'Pricing and amenities',
      'Booking inquiries',
      'Date selection',
      'Booking database',
      'Administrative reservation views',
    ],
    plannedFeatures: [
      'Real-time availability locking',
      'Online payments',
    ],
    contribution:
      'Built the room category catalog, date-selection reservation inquiry form, SQL booking database, and administrative reservation management screens.',
    previewKind: 'hotel-booking',
    accentColor: '#2BA89C',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Verified live URL not attached yet (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Verified repository URL not attached yet (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '03',
    slug: 'online-shop-websites',
    title: 'Online Shop Websites',
    category: 'E-Commerce',
    status: 'Client work',
    technologies: ['WordPress', 'HTML5', 'CSS3', 'JavaScript', 'WooCommerce'],
    description:
      'Custom retail storefronts featuring product catalogs, shopping carts and responsive shopping experiences.',
    implementedFeatures: [
      'Product catalogs',
      'Shopping carts',
      'Responsive shopping experiences',
      'WooCommerce storefront customization',
    ],
    plannedFeatures: [],
    contribution:
      'Configured WooCommerce retail stores, structured product catalogs, and customized responsive front-end layouts for client storefronts.',
    previewKind: 'ecommerce',
    accentColor: '#EE5D52',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Client storefront URL slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Repository link not published (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '04',
    slug: 'store-management-applications',
    title: 'Store Management Applications',
    category: 'Business Operations',
    status: 'Client work',
    technologies: ['JavaScript', 'HTML5', 'CSS3', 'Relational DB'],
    description:
      'Operational tools for small businesses to manage inventory, transactions and stock records.',
    implementedFeatures: [
      'Inventory tracking',
      'Transaction recording',
      'Stock record management',
      'Relational database integration',
    ],
    plannedFeatures: [],
    contribution:
      'Developed practical operational web interfaces and relational database workflows helping small businesses track stock and daily transactions.',
    previewKind: 'store-ops',
    accentColor: '#E69F38',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Private client tool — URL slot editable in src/data/projectsData.ts',
      repoPlaceholder: 'Private repository — URL slot editable in src/data/projectsData.ts',
    },
  },
  {
    number: '05',
    slug: 'granbell-hotel-system',
    title: 'Granbell Hotel System',
    category: 'Full-Stack Web Application',
    status: 'In development',
    technologies: ['React', 'Node.js', 'Express', 'PostgreSQL', 'TypeScript'],
    description:
      'Hotel management system with room state modelling and administrative management.',
    implementedFeatures: [
      'Room state modelling',
      'Administrative management views',
      'Express & PostgreSQL API foundation',
    ],
    plannedFeatures: [
      'Full end-to-end booking workflow',
      'Operational analytics & staff scheduling views',
    ],
    contribution:
      'Architecting the full-stack TypeScript application structure, PostgreSQL room-state models, and administrative UI components.',
    previewKind: 'granbell',
    accentColor: '#2BA89C',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'In development — verified live URL slot (src/data/projectsData.ts)',
      repoPlaceholder: 'In development — verified repository slot (src/data/projectsData.ts)',
    },
  },
  {
    number: '06',
    slug: 'galleryx-media-manager',
    title: 'GalleryX Media Manager',
    category: 'Android Application',
    status: 'In development',
    technologies: ['Kotlin', 'Android SDK', 'MediaStore', 'Room', 'MVVM', 'Coil'],
    description:
      'Android media gallery exploring modern application architecture and local photo and video management.',
    implementedFeatures: [
      'Local photo & video browsing via MediaStore',
      'MVVM architecture layers',
      'Room persistence & Coil image rendering setup',
    ],
    plannedFeatures: [
      'Custom album grouping',
      'Extended batch media management actions',
    ],
    contribution:
      'Building a native Kotlin Android application applying MVVM separation, MediaStore indexing, Room caching, and Coil loading.',
    previewKind: 'galleryx',
    accentColor: '#6A9A68',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'APK / Play Store link slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Verified repository slot (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '07',
    slug: 'small-business-mobile-utilities',
    title: 'Small Business Mobile Utilities',
    category: 'Mobile Application',
    status: 'In development',
    technologies: ['Flutter', 'Dart', 'Mobile UI'],
    description:
      'Mobile application concepts for order capture, invoice generation and customer address management.',
    implementedFeatures: [
      'Order capture UI flows',
      'Invoice layout concepts',
      'Customer address book views',
    ],
    plannedFeatures: [
      'Local persistence & exportable invoice PDFs',
      'Cross-device sync exploration',
    ],
    contribution:
      'Designing and prototyping Flutter and Dart mobile screens tailored to quick small-business order and customer record entry.',
    previewKind: 'mobile-utilities',
    accentColor: '#F27D3B',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Mobile demo link slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Verified repository slot (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '08',
    slug: 'film-streaming-media-portal',
    title: 'Film Streaming & Media Portal',
    category: 'Web Application',
    status: 'In development',
    technologies: ['React', 'TypeScript', 'Vite', 'Express', 'MySQL', 'Tailwind CSS'],
    description:
      'Media discovery and cataloguing application with sample media players, category management and administrative tools.',
    implementedFeatures: [
      'Media discovery catalog',
      'Sample media player views',
      'Category management',
      'Administrative catalog tools',
    ],
    plannedFeatures: [
      'Watchlist & continue-watching state',
      'Advanced catalog search filters',
    ],
    contribution:
      'Building the Vite + React TypeScript front end, Tailwind styling, Express backend endpoints, and MySQL media catalog schema.',
    previewKind: 'media-portal',
    accentColor: '#EE5D52',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'In development — live URL slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'In development — repo URL slot (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '09',
    slug: 'smartmove-transport-solutions',
    title: 'SmartMove Transport Solutions',
    category: 'Coursework Project',
    status: 'Coursework',
    technologies: ['Oracle PL/SQL', 'MongoDB', 'Node.js', 'Express', 'JavaScript'],
    description:
      'NIBM transport management coursework exploring relational transactions and MongoDB-based telemetry.',
    implementedFeatures: [
      'Oracle PL/SQL relational transactions',
      'MongoDB telemetry data structures',
      'Node.js & Express service integration',
    ],
    plannedFeatures: [
      'Unified reporting across SQL and telemetry collections',
    ],
    contribution:
      'Authored Oracle PL/SQL database procedures and connected MongoDB telemetry storage inside the NIBM coursework backend.',
    previewKind: 'smartmove',
    accentColor: '#3E7B9E',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Coursework demo link slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Coursework repository slot (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '10',
    slug: 'automated-coconut-milk-extraction-system',
    title: 'Automated Coconut Milk Extraction System',
    category: 'Hardware & Automation',
    status: 'Prototype / Design',
    technologies: ['Arduino', 'C/C++', 'L298N Driver', '12V Motor', 'Sensors', 'USB Serial'],
    description:
      'Automated coconut milk extraction system design involving motor control and multi-sensor monitoring.',
    implementedFeatures: [
      'L298N 12V DC motor driver control logic',
      'Multi-sensor state reading',
      'USB Serial telemetry debugging output',
    ],
    plannedFeatures: [
      'Mechanical frame refinement',
      'Automated safety cutoff calibration',
    ],
    contribution:
      'Created the Arduino C/C++ control sketch, wired the L298N motor driver and sensor array, and implemented USB Serial monitoring.',
    previewKind: 'coconut-automation',
    accentColor: '#6A9A68',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Documentation / video link slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Firmware repository slot (editable in src/data/projectsData.ts)',
    },
  },
  {
    number: '11',
    slug: 'smart-gate-access-system',
    title: 'Smart Gate Access System',
    category: 'Electronics Prototype',
    status: 'Electronics prototype',
    technologies: ['Arduino', 'C/C++', 'RFID RC522', 'Keypad', 'Logic Gates', 'Hardware'],
    description:
      'Physical access control prototype integrating RFID, keypad access and a servo-controlled barrier.',
    implementedFeatures: [
      'RFID RC522 tag detection & validation',
      'Matrix keypad PIN entry',
      'Hardware logic gate coordination',
      'Servo-controlled physical barrier arm',
    ],
    plannedFeatures: [
      'Timestamped access log export module',
    ],
    contribution:
      'Integrated the Arduino controller, RC522 RFID reader, keypad module, logic gate circuit, and servo-actuated barrier mechanism.',
    previewKind: 'smart-gate',
    accentColor: '#D9601E',
    links: {
      liveUrl: '',
      repoUrl: '',
      livePlaceholder: 'Prototype showcase link slot (editable in src/data/projectsData.ts)',
      repoPlaceholder: 'Sketch repository slot (editable in src/data/projectsData.ts)',
    },
  },
];

export function getProjectCounts() {
  const total = PORTFOLIO_PROJECTS.length;
  const completedOrClient = PORTFOLIO_PROJECTS.filter(
    (p) => p.status === 'Client work' || p.status === 'Personal project' || p.status === 'Coursework',
  ).length;
  const inDevelopment = PORTFOLIO_PROJECTS.filter(
    (p) => p.status === 'In development',
  ).length;
  const hardwarePrototypes = PORTFOLIO_PROJECTS.filter(
    (p) => p.status === 'Prototype / Design' || p.status === 'Electronics prototype',
  ).length;

  return { total, completedOrClient, inDevelopment, hardwarePrototypes };
}

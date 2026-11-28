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
    role: 'Sole Full-Stack Developer',
    problemSolved: 'Centralizes scattered lecture slides, course rosters, and role-gated administration into one lightweight PHP & MySQL portal.',
    architectureSummary: 'Server-rendered PHP MVC pages backed by normalized MySQL tables for users, courses, enrollments, and uploaded lesson assets.',
    outcomeNote: 'Personal full-stack build with working enrollment and role workflows; quiz grading and discussion boards scoped next.',
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
    role: 'Web & Database Developer',
    problemSolved: 'Replaces manual spreadsheet reservation inquiries with structured room browsing, stay-date capture, and admin lookup.',
    architectureSummary: 'PHP server handlers + SQL booking schema pairing guest inquiry forms with staff reservation views.',
    outcomeNote: 'Core booking catalog and admin views implemented; live availability locking & payment gateway noted for next phase.',
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
    role: 'Freelance Web Developer',
    problemSolved: 'Brings local retail inventories online with mobile-friendly product browsing and self-manageable WooCommerce checkout.',
    architectureSummary: 'WordPress + WooCommerce storefront theme customized with responsive CSS3/JS product filter and cart templates.',
    outcomeNote: 'Delivered live-ready client storefronts tailored for non-technical shop owners to manage listings.',
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
    role: 'Freelance Systems Developer',
    problemSolved: 'Eliminates paper-ledger stock mismatches for small shops via quick daily item logging and relational records.',
    architectureSummary: 'Browser dashboard UI paired with normalized relational stock, supplier, and transaction tables.',
    outcomeNote: 'Deployed for small-business operations workflows tracking inventory adjustments and daily sales logs.',
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
    role: 'Full-Stack TypeScript Architect',
    problemSolved: 'Models strict room availability states (vacant, reserved, occupied, housekeeping) cleanly across frontend and SQL layers.',
    architectureSummary: 'React + TypeScript SPA communicating with an Express REST API and PostgreSQL relational data model.',
    outcomeNote: 'Active build; Express API foundation and room-state schemas operational while end-to-end staff scheduling continues.',
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
    role: 'Android Kotlin Developer',
    problemSolved: 'Keeps large on-device photo and video libraries responsive using modern Kotlin concurrency and paged MediaStore queries.',
    architectureSummary: 'Android Jetpack MVVM with Repository layer combining ContentResolver MediaStore scans, Room cache, and Coil image pipeline.',
    outcomeNote: 'In active development; fast local media grid and Room caching verified on Android Studio emulator.',
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
    role: 'Cross-Platform Mobile Developer',
    problemSolved: 'Speeds up counter-side order entry, invoice drafting, and delivery address lookup on affordable smartphones.',
    architectureSummary: 'Flutter widget tree in Dart structured around modular order-capture, customer directory, and invoice preview flows.',
    outcomeNote: 'Core UI flows implemented in development; local offline invoice persistence and PDF export scoped next.',
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
    role: 'Full-Stack Web Developer',
    problemSolved: 'Organizes curated film metadata, genre taxonomy, and sample stream playback in one responsive web portal.',
    architectureSummary: 'React + TypeScript + Tailwind SPA consuming Express REST endpoints backed by MySQL catalog and category tables.',
    outcomeNote: 'Catalog browsing, player views, and admin category tools implemented while watchlist sync continues.',
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
    role: 'Backend & Database Engineer (Coursework)',
    problemSolved: 'Bridges ACID-strict transport dispatch records with high-frequency vehicle telemetry payloads across polyglot storage.',
    architectureSummary: 'Node.js & Express API coordinating Oracle PL/SQL transactional stored procedures alongside MongoDB telemetry collections.',
    outcomeNote: 'Completed NIBM coursework demonstrating hybrid relational + document storage integration.',
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
    role: 'Embedded Systems & Firmware Designer',
    problemSolved: 'Automates timed pressing and motor-load supervision to reduce manual labor during coconut milk extraction.',
    architectureSummary: 'Arduino microcontroller running C/C++ state-machine logic over L298N H-bridge driver, analog sensors, and USB serial logs.',
    outcomeNote: 'Control firmware, bench wiring, and live serial telemetry verified at prototype stage.',
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
    role: 'Hardware & Embedded Prototype Builder',
    problemSolved: 'Provides dual-factor RFID card + PIN entry physical barrier control for small compound gates.',
    architectureSummary: 'Arduino C/C++ controller reading SPI RFID RC522 tags & matrix keypad inputs through combinational logic into a servo gate actuator.',
    outcomeNote: 'Working electronics bench prototype recreated virtually inside Signal Workshop’s 3D RFID challenge.',
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

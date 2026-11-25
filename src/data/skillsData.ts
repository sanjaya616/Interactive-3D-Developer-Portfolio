import type { SkillCategoryName, SkillItem } from '../types/portfolio.ts';

export const SKILL_CATEGORIES: SkillCategoryName[] = [
  'Frontend',
  'Backend and Databases',
  'Mobile and Games',
  'Tools and Workflow',
  'Creative Work',
];

/**
 * All 24 actual skills for Sanjaya Lakshan — no fabricated years or percentages.
 */
export const SKILLS_CATALOG: SkillItem[] = [
  // FRONTEND (6)
  {
    id: 'html5',
    name: 'HTML5',
    category: 'Frontend',
    shortDescription: 'Semantic document structure, accessible markup, and responsive web forms.',
    detailDescription:
      'Used across web portals, reservation platforms, retail storefronts, and small business web tools for clean, maintainable markup.',
    symbolKey: 'html5',
    accentColor: '#F27D3B',
  },
  {
    id: 'css3',
    name: 'CSS3 / Modern CSS',
    category: 'Frontend',
    shortDescription: 'Responsive layouts with Flexbox, Grid, custom properties, and adaptive styling.',
    detailDescription:
      'Applied across client storefronts, hotel reservation views, and modern Tailwind-based interfaces across desktop and mobile viewports.',
    symbolKey: 'css3',
    accentColor: '#2BA89C',
  },
  {
    id: 'javascript',
    name: 'JavaScript ES6+',
    category: 'Frontend',
    shortDescription: 'Interactive DOM workflows, async API handling, and modular application logic.',
    detailDescription:
      'Core language powering interactive forms, client store operations tools, and full-stack Node.js and browser experiences.',
    symbolKey: 'js',
    accentColor: '#E69F38',
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frontend',
    shortDescription: 'Component-driven interfaces, hooks, and modular single-page architectures.',
    detailDescription:
      'Used in active TypeScript projects including the Granbell Hotel System, Film Streaming & Media Portal, and interactive 3D web experiences.',
    symbolKey: 'react',
    accentColor: '#2BA89C',
  },
  {
    id: 'ui-design',
    name: 'UI Design',
    category: 'Frontend',
    shortDescription: 'Clear typography, structured screen hierarchy, and usable interactive controls.',
    detailDescription:
      'Focused on practical readability across dashboards, mobile utility screens, reservation flows, and administrative interfaces.',
    symbolKey: 'ui',
    accentColor: '#EE5D52',
  },
  {
    id: 'website-design',
    name: 'Website Design',
    category: 'Frontend',
    shortDescription: 'End-to-end visual page layouts designed for clarity and client usability.',
    detailDescription:
      'Applied to freelance retail websites, informational portals, and custom small-business presence sites.',
    symbolKey: 'web-design',
    accentColor: '#F27D3B',
  },

  // BACKEND AND DATABASES (9)
  {
    id: 'php',
    name: 'PHP',
    category: 'Backend and Databases',
    shortDescription: 'Server-side web scripting for dynamic portals, authentication, and database apps.',
    detailDescription:
      'Built the Learning Management System and Hotel Booking System using PHP server-side controllers and form processing.',
    symbolKey: 'php',
    accentColor: '#3E7B9E',
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'Backend and Databases',
    shortDescription: 'Relational querying, table design, joins, constraints, and transactional data.',
    detailDescription:
      'Foundation across reservation databases, educational enrollment schemas, store inventories, and NIBM database coursework.',
    symbolKey: 'sql',
    accentColor: '#2BA89C',
  },
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'Backend and Databases',
    shortDescription: 'Relational database engine for structured web applications and catalogs.',
    detailDescription:
      'Powers the Learning Management System relational schema and the Film Streaming & Media Portal catalog backend.',
    symbolKey: 'mysql',
    accentColor: '#F27D3B',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'Backend and Databases',
    shortDescription: 'Robust relational SQL database used in modern TypeScript & Node.js stacks.',
    detailDescription:
      'Used in Granbell Hotel System for structured room-state modelling and reliable reservation integrity.',
    symbolKey: 'postgres',
    accentColor: '#3E7B9E',
  },
  {
    id: 'oracle-plsql',
    name: 'Oracle PL/SQL',
    category: 'Backend and Databases',
    shortDescription: 'Stored procedures, triggers, and structured relational transactions.',
    detailDescription:
      'Applied in NIBM SmartMove Transport Solutions coursework to enforce transactional logic alongside NoSQL telemetry.',
    symbolKey: 'oracle',
    accentColor: '#EE5D52',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'Backend and Databases',
    shortDescription: 'Document-oriented NoSQL storage for flexible telemetry and event records.',
    detailDescription:
      'Explored in SmartMove Transport Solutions for storing flexible transport telemetry records alongside Node.js services.',
    symbolKey: 'mongodb',
    accentColor: '#6A9A68',
  },
  {
    id: 'python',
    name: 'Python',
    category: 'Backend and Databases',
    shortDescription: 'Clean general-purpose scripting, problem solving, and foundational automation.',
    detailDescription:
      'Used for algorithmic coursework, rapid scripting utilities, and structured programming practice.',
    symbolKey: 'python',
    accentColor: '#E69F38',
  },
  {
    id: 'c-programming',
    name: 'C Programming',
    category: 'Backend and Databases',
    shortDescription: 'Low-level structured programming, memory fundamentals, and embedded logic.',
    detailDescription:
      'Supports systems coursework and Arduino C/C++ hardware & automation firmware work.',
    symbolKey: 'c',
    accentColor: '#3E7B9E',
  },
  {
    id: 'csharp-dotnet',
    name: 'C# (.NET)',
    category: 'Backend and Databases',
    shortDescription: 'Object-oriented desktop and application engineering within the .NET ecosystem.',
    detailDescription:
      'Applied in software engineering coursework for typed application structure and relational database connectivity.',
    symbolKey: 'dotnet',
    accentColor: '#635850',
  },

  // MOBILE AND GAMES (3)
  {
    id: 'flutter-dart',
    name: 'Flutter / Dart',
    category: 'Mobile and Games',
    shortDescription: 'Cross-platform mobile UI toolkit for structured business utility prototypes.',
    detailDescription:
      'Used to explore order capture, invoice formatting, and customer address management flows in Small Business Mobile Utilities.',
    symbolKey: 'flutter',
    accentColor: '#2BA89C',
  },
  {
    id: 'mobile-app-dev',
    name: 'Mobile App Development',
    category: 'Mobile and Games',
    shortDescription: 'Native Kotlin/Android and cross-platform mobile architecture exploration.',
    detailDescription:
      'Practiced through GalleryX Media Manager (Kotlin, MediaStore, Room, MVVM, Coil) and Flutter business utility prototypes.',
    symbolKey: 'mobile',
    accentColor: '#6A9A68',
  },
  {
    id: 'mobile-game-dev',
    name: 'Mobile Game Development',
    category: 'Mobile and Games',
    shortDescription: 'Exploratory interactive game loops, responsive controls, and playable mechanics.',
    detailDescription:
      'Ongoing creative exploration combining touch-friendly controls, compact scenes, and interactive game feel.',
    symbolKey: 'game',
    accentColor: '#F27D3B',
  },

  // TOOLS AND WORKFLOW (4)
  {
    id: 'git',
    name: 'Git',
    category: 'Tools and Workflow',
    shortDescription: 'Version control branching, clean commit history, and collaborative code tracking.',
    detailDescription:
      'Used daily across academic coursework, personal builds, and freelance client project iterations.',
    symbolKey: 'git',
    accentColor: '#EE5D52',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Tools and Workflow',
    shortDescription: 'Remote source hosting, issue tracking, and project repository organization.',
    detailDescription:
      'Maintains open engineering work and development backups at github.com/sanjaya616.',
    symbolKey: 'github',
    accentColor: '#2B2623',
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    category: 'Tools and Workflow',
    shortDescription: 'CMS customization, WooCommerce storefront setup, and client site delivery.',
    detailDescription:
      'Delivered responsive online retail shop websites tailored for practical client catalog updates.',
    symbolKey: 'wordpress',
    accentColor: '#3E7B9E',
  },
  {
    id: 'project-management',
    name: 'Project Management',
    category: 'Tools and Workflow',
    shortDescription: 'Requirement gathering, milestone breakdown, and client delivery coordination.',
    detailDescription:
      'Practiced across freelance work since 2023—scoping requirements, planning database structures, and shipping iterations.',
    symbolKey: 'workflow',
    accentColor: '#E69F38',
  },

  // CREATIVE WORK (2)
  {
    id: 'photo-editing',
    name: 'Photo Editing',
    category: 'Creative Work',
    shortDescription: 'Product image preparation, color cleanup, and visual assets for storefronts.',
    detailDescription:
      'Supports retail storefront builds and digital UI presentation with crisp, balanced imagery.',
    symbolKey: 'photo',
    accentColor: '#F27D3B',
  },
  {
    id: 'video-editing',
    name: 'Video Editing',
    category: 'Creative Work',
    shortDescription: 'Cutting project demos, hardware prototype showcases, and digital media storytelling.',
    detailDescription:
      'Exploratory creative skill supporting electronics prototype walk-throughs and media portal concepts.',
    symbolKey: 'video',
    accentColor: '#EE5D52',
  },
];

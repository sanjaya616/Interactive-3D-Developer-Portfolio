import type { ServiceOffering } from '../types/portfolio.ts';

/**
 * Six services clearly distinguishing Established Development Services
 * from Exploratory Areas, each with verified technologies.
 */
export const SERVICES_LIST: ServiceOffering[] = [
  {
    id: 'web-development',
    number: '01',
    title: 'Web Development',
    tier: 'Established Service',
    description:
      'Practical, responsive websites, booking systems, e-commerce storefronts, and custom business web tools engineered for daily reliability.',
    technologies: ['PHP', 'JavaScript', 'React', 'TypeScript', 'WordPress', 'WooCommerce', 'HTML5', 'CSS3'],
    focusAreas: [
      'PHP, JavaScript ES6+, React & TypeScript portals',
      'WordPress & WooCommerce retail storefronts',
      'Administrative dashboards & role workflows',
    ],
  },
  {
    id: 'web-ui-design',
    number: '02',
    title: 'Web and UI Design',
    tier: 'Established Service',
    description:
      'Clean visual layouts, legible screen hierarchy, and structured interfaces crafted around real customer and operator flows.',
    technologies: ['HTML5', 'CSS3', 'Responsive Design', 'UI Layout Systems'],
    focusAreas: [
      'Responsive desktop & mobile page layouts',
      'Clear navigation and booking/catalog UX',
      'Accessible typography and high-contrast interfaces',
    ],
  },
  {
    id: 'database-design',
    number: '03',
    title: 'Database Design',
    tier: 'Established Service',
    description:
      'Normalized relational schemas, queries, and data workflows designed for inventory systems, educational portals, and reservation platforms.',
    technologies: ['MySQL', 'PostgreSQL', 'Oracle PL/SQL', 'SQL', 'MongoDB'],
    focusAreas: [
      'MySQL & PostgreSQL schema modelling',
      'Oracle PL/SQL transactional logic',
      'MongoDB document telemetry exploration',
    ],
  },
  {
    id: 'mobile-app-development',
    number: '04',
    title: 'Mobile App Development',
    tier: 'Exploratory Area',
    description:
      'Prototyping native Android (Kotlin, MVVM, Room) and cross-platform Flutter utilities for media organization and small-business order workflows.',
    technologies: ['Kotlin', 'Android Studio', 'Room / MediaStore', 'Flutter', 'Dart'],
    focusAreas: [
      'Android MediaStore & Room concepts (GalleryX)',
      'Flutter / Dart order & invoice prototypes',
      'Mobile game mechanics exploration',
    ],
  },
  {
    id: 'creative-media-editing',
    number: '05',
    title: 'Creative and Media Editing',
    tier: 'Exploratory Area',
    description:
      'Visual media preparation supporting product catalogs, storefront photography cleanup, and technical prototype demo edits.',
    technologies: ['Photo Editing', 'Video Editing', 'Product Graphics'],
    focusAreas: [
      'Photo editing & product visual preparation',
      'Video editing for project showcases',
      'Custom visual graphics for digital interfaces',
    ],
  },
  {
    id: 'hardware-automation',
    number: '06',
    title: 'Hardware and Automation',
    tier: 'Exploratory Area',
    description:
      'Hands-on microcontroller, sensor, motor driver, and RFID access-control prototypes blending C/C++ logic with physical mechanisms.',
    technologies: ['Arduino', 'C / C++', 'RFID RC522', 'L298N Motor Driver', 'Sensors & Servos'],
    focusAreas: [
      'Arduino C/C++ & L298N 12V motor control',
      'RFID RC522, keypad & servo barrier systems',
      'Multi-sensor reading & USB Serial monitoring',
    ],
  },
];

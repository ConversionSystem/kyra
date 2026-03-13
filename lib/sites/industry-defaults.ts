// Industry defaults for the Website Builder wizard
// Maps industry slugs to default services, branding, and config

export interface IndustryDefault {
  label: string;
  services: { name: string; slug: string }[];
  designStyle: string;
  colors: { primary: string; secondary: string };
  aiName: string;
  needsGeoPages: boolean;
  defaultPageCount: number;
  nearbyCities: string[];
}

export const INDUSTRY_DEFAULTS: Record<string, IndustryDefault> = {
  hvac: {
    label: 'HVAC',
    services: [
      { name: 'AC Repair', slug: 'ac-repair' },
      { name: 'Heating Repair', slug: 'heating-repair' },
      { name: 'AC Installation', slug: 'ac-installation' },
      { name: 'Furnace Installation', slug: 'furnace-installation' },
      { name: 'Duct Cleaning', slug: 'duct-cleaning' },
      { name: 'HVAC Maintenance', slug: 'hvac-maintenance' },
    ],
    designStyle: 'modern-dark',
    colors: { primary: '#dc2626', secondary: '#111827' },
    aiName: 'Alex',
    needsGeoPages: true,
    defaultPageCount: 25,
    nearbyCities: ['San Mateo', 'Burlingame', 'Foster City', 'Redwood City', 'Belmont', 'San Carlos', 'Daly City', 'South San Francisco', 'Millbrae', 'Half Moon Bay'],
  },
  plumbing: {
    label: 'Plumbing',
    services: [
      { name: 'Drain Cleaning', slug: 'drain-cleaning' },
      { name: 'Water Heater Repair', slug: 'water-heater-repair' },
      { name: 'Leak Detection', slug: 'leak-detection' },
      { name: 'Sewer Line Repair', slug: 'sewer-line-repair' },
      { name: 'Pipe Repair', slug: 'pipe-repair' },
      { name: 'Fixture Installation', slug: 'fixture-installation' },
    ],
    designStyle: 'clean-light',
    colors: { primary: '#2563eb', secondary: '#1e3a5f' },
    aiName: 'Sam',
    needsGeoPages: true,
    defaultPageCount: 25,
    nearbyCities: ['San Jose', 'Sunnyvale', 'Santa Clara', 'Mountain View', 'Palo Alto', 'Cupertino', 'Milpitas', 'Fremont', 'Campbell', 'Los Gatos'],
  },
  electrical: {
    label: 'Electrical',
    services: [
      { name: 'Electrical Repair', slug: 'electrical-repair' },
      { name: 'Panel Upgrade', slug: 'panel-upgrade' },
      { name: 'Outlet Installation', slug: 'outlet-installation' },
      { name: 'Lighting Installation', slug: 'lighting-installation' },
      { name: 'EV Charger Installation', slug: 'ev-charger-installation' },
      { name: 'Electrical Inspection', slug: 'electrical-inspection' },
    ],
    designStyle: 'modern-dark',
    colors: { primary: '#f59e0b', secondary: '#1f2937' },
    aiName: 'Sparky',
    needsGeoPages: true,
    defaultPageCount: 25,
    nearbyCities: ['Oakland', 'Berkeley', 'Hayward', 'San Leandro', 'Alameda', 'Fremont', 'Union City', 'Newark', 'Pleasanton', 'Dublin'],
  },
  dental: {
    label: 'Dental',
    services: [
      { name: 'General Dentistry', slug: 'general-dentistry' },
      { name: 'Teeth Whitening', slug: 'teeth-whitening' },
      { name: 'Dental Implants', slug: 'dental-implants' },
      { name: 'Invisalign', slug: 'invisalign' },
      { name: 'Root Canal', slug: 'root-canal' },
      { name: 'Emergency Dentistry', slug: 'emergency-dentistry' },
    ],
    designStyle: 'clean-light',
    colors: { primary: '#0d9488', secondary: '#f0fdfa' },
    aiName: 'Dana',
    needsGeoPages: false,
    defaultPageCount: 15,
    nearbyCities: [],
  },
  legal: {
    label: 'Legal',
    services: [
      { name: 'Personal Injury', slug: 'personal-injury' },
      { name: 'Family Law', slug: 'family-law' },
      { name: 'Criminal Defense', slug: 'criminal-defense' },
      { name: 'Estate Planning', slug: 'estate-planning' },
      { name: 'Business Law', slug: 'business-law' },
      { name: 'Immigration', slug: 'immigration' },
    ],
    designStyle: 'modern-dark',
    colors: { primary: '#b45309', secondary: '#1c1917' },
    aiName: 'James',
    needsGeoPages: false,
    defaultPageCount: 18,
    nearbyCities: [],
  },
  restaurant: {
    label: 'Restaurant',
    services: [
      { name: 'Dine-In', slug: 'dine-in' },
      { name: 'Takeout', slug: 'takeout' },
      { name: 'Catering', slug: 'catering' },
      { name: 'Private Events', slug: 'private-events' },
      { name: 'Delivery', slug: 'delivery' },
    ],
    designStyle: 'bold',
    colors: { primary: '#dc2626', secondary: '#fef2f2' },
    aiName: 'Aria',
    needsGeoPages: false,
    defaultPageCount: 10,
    nearbyCities: [],
  },
  'real-estate': {
    label: 'Real Estate',
    services: [
      { name: 'Buying', slug: 'buying' },
      { name: 'Selling', slug: 'selling' },
      { name: 'Property Valuation', slug: 'property-valuation' },
      { name: 'Relocation', slug: 'relocation' },
      { name: 'Investment Properties', slug: 'investment-properties' },
      { name: 'First-Time Buyers', slug: 'first-time-buyers' },
    ],
    designStyle: 'clean-light',
    colors: { primary: '#4f46e5', secondary: '#eef2ff' },
    aiName: 'Riley',
    needsGeoPages: true,
    defaultPageCount: 25,
    nearbyCities: ['Los Angeles', 'Beverly Hills', 'Santa Monica', 'Pasadena', 'Glendale', 'Burbank', 'Long Beach', 'Culver City', 'West Hollywood', 'Malibu'],
  },
  auto: {
    label: 'Auto / Mechanic',
    services: [
      { name: 'Oil Change', slug: 'oil-change' },
      { name: 'Brake Repair', slug: 'brake-repair' },
      { name: 'Engine Diagnostics', slug: 'engine-diagnostics' },
      { name: 'Transmission Repair', slug: 'transmission-repair' },
      { name: 'Tire Service', slug: 'tire-service' },
      { name: 'AC Repair', slug: 'auto-ac-repair' },
    ],
    designStyle: 'modern-dark',
    colors: { primary: '#ef4444', secondary: '#18181b' },
    aiName: 'Max',
    needsGeoPages: true,
    defaultPageCount: 30,
    nearbyCities: ['Houston', 'Sugar Land', 'Katy', 'Pearland', 'Pasadena', 'The Woodlands', 'Spring', 'Cypress', 'Humble', 'Missouri City'],
  },
  'med-spa': {
    label: 'Medical Spa',
    services: [
      { name: 'Botox', slug: 'botox' },
      { name: 'Dermal Fillers', slug: 'dermal-fillers' },
      { name: 'Laser Hair Removal', slug: 'laser-hair-removal' },
      { name: 'Chemical Peels', slug: 'chemical-peels' },
      { name: 'Microneedling', slug: 'microneedling' },
      { name: 'Body Contouring', slug: 'body-contouring' },
    ],
    designStyle: 'minimal',
    colors: { primary: '#ec4899', secondary: '#fdf2f8' },
    aiName: 'Sophia',
    needsGeoPages: false,
    defaultPageCount: 18,
    nearbyCities: [],
  },
  fitness: {
    label: 'Fitness / Gym',
    services: [
      { name: 'Personal Training', slug: 'personal-training' },
      { name: 'Group Classes', slug: 'group-classes' },
      { name: 'Yoga', slug: 'yoga' },
      { name: 'CrossFit', slug: 'crossfit' },
      { name: 'Nutrition Coaching', slug: 'nutrition-coaching' },
    ],
    designStyle: 'bold',
    colors: { primary: '#7c3aed', secondary: '#1e1b4b' },
    aiName: 'Coach',
    needsGeoPages: false,
    defaultPageCount: 10,
    nearbyCities: [],
  },
  veterinary: {
    label: 'Veterinary',
    services: [
      { name: 'Wellness Exams', slug: 'wellness-exams' },
      { name: 'Vaccinations', slug: 'vaccinations' },
      { name: 'Surgery', slug: 'surgery' },
      { name: 'Dental Care', slug: 'dental-care' },
      { name: 'Emergency Care', slug: 'emergency-care' },
      { name: 'Grooming', slug: 'grooming' },
    ],
    designStyle: 'clean-light',
    colors: { primary: '#059669', secondary: '#ecfdf5' },
    aiName: 'Doc',
    needsGeoPages: false,
    defaultPageCount: 18,
    nearbyCities: [],
  },
  consulting: {
    label: 'Consulting',
    services: [
      { name: 'Strategy Consulting', slug: 'strategy-consulting' },
      { name: 'Operations', slug: 'operations' },
      { name: 'Digital Transformation', slug: 'digital-transformation' },
      { name: 'Marketing Strategy', slug: 'marketing-strategy' },
      { name: 'Financial Advisory', slug: 'financial-advisory' },
    ],
    designStyle: 'minimal',
    colors: { primary: '#1e40af', secondary: '#eff6ff' },
    aiName: 'Jordan',
    needsGeoPages: false,
    defaultPageCount: 10,
    nearbyCities: [],
  },
};

export const DESIGN_STYLES = [
  { id: 'modern-dark', label: 'Modern Dark', description: 'Bold dark backgrounds with vibrant accents', preview: '🌙' },
  { id: 'clean-light', label: 'Clean Light', description: 'Crisp white layouts with subtle shadows', preview: '☀️' },
  { id: 'bold', label: 'Bold', description: 'Strong colors, large typography, high contrast', preview: '🔥' },
  { id: 'minimal', label: 'Minimal', description: 'Lots of whitespace, understated elegance', preview: '✨' },
] as const;

export const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Polished and authoritative' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { id: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
] as const;

export const AI_CAPABILITIES = [
  { id: 'answer_questions', label: 'Answer questions' },
  { id: 'book_appointments', label: 'Book appointments' },
  { id: 'capture_leads', label: 'Capture leads' },
  { id: 'provide_quotes', label: 'Provide quotes' },
  { id: 'qualify_leads', label: 'Qualify leads' },
] as const;

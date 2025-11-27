// Constants for Leonardo School

export const SITE_NAME = 'Leonardo School';
export const SITE_DESCRIPTION = 
  'Leonardo School Catania: preparazione test medicina, odontoiatria, veterinaria, professioni sanitarie, architettura e TOLC. Corsi, simulazioni e tutor qualificati per l\'ammissione all\'università.';

export const SITE_KEYWORDS = [
  'leonardo school catania',
  'preparazione ammissione universitaria',
  'test medicina catania',
  'corsi medicina catania',
  'test odontoiatria catania',
  'test veterinaria catania',
  'professioni sanitarie catania',
  'preparazione professioni sanitarie',
  'simulazione test medicina',
  'TOLC medicina',
  'TOLC test',
  'corsi test ammissione catania',
  'scuola preparazione medicina sicilia',
  'test ingresso medicina',
  'test architettura catania',
  'preparazione università catania',
  'corso test universitari',
  'tutor medicina catania',
  'preparazione TOLC catania',
  'CEnT test medicina',
];

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/Leonardo-School-115110770367756',
  instagram: 'https://www.instagram.com/leonardo.school/',
  youtube: 'https://www.youtube.com/@leonardoformazione',
  linkedin: 'https://www.linkedin.com/company/leonardoschool',
  tiktok: 'https://www.tiktok.com/@leonardo.school',
};

export const NAVIGATION = [
  {
    label: 'Didattica',
    href: '/didattica',
    submenu: [
      { label: 'Medicina, Odontoiatria e Veterinaria', href: '/didattica?corso=medicina' },
      { label: 'Professioni Sanitarie', href: '/didattica?corso=snt' },
      { label: 'Architettura', href: '/didattica?corso=arched' },
      { label: 'Altro', href: '/didattica?corso=altro' },
    ],
  },
  { label: 'Simulazione', href: '/simulazione' },
  { label: 'Test', href: '/test' },
  { label: 'Prove', href: '/prove' },
  { label: 'Contattaci', href: '/contattaci' },
  {
    label: 'Altro',
    href: '#',
    submenu: [
      { label: 'Chi siamo', href: '/chi-siamo' },
      { label: 'Lavora con noi', href: '/lavora-con-noi' },
      { label: 'Termini e condizioni', href: '/privacy-policy.pdf' },
    ],
  },
];

export const STATS = [
  { icon: 'users', value: 366, suffix: '+', label: 'Studenti soddisfatti' },
  { icon: 'graduation-cap', value: 92, suffix: '%', label: 'Ammessi in 1ᵃ scelta', prefix: '>' },
  { icon: 'book', value: 4732, suffix: '+', label: 'Ore di corso svolte' },
  { icon: 'user', value: 20, suffix: '+', label: 'Giovani tutor' },
];

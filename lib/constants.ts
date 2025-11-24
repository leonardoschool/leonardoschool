// Constants for Leonardo School

export const SITE_NAME = 'Leonardo School';
export const SITE_DESCRIPTION = 
  'Leonardo School si occupa di preparare i ragazzi al superamento dei test ministeriali per le facoltà di medicina, professioni sanitarie e veterinaria';

export const SITE_KEYWORDS = [
  'leonardo school',
  'medicina',
  'università',
  'test',
  'test accesso',
  'professioni sanitarie',
  'preparazione',
  'medico',
  'studenti',
  'veterinaria',
  'catania',
  'scuola',
  'scuola superiore',
  'liceo',
  'sanitario',
  'infermiere',
  'tecnico',
  'laboratorio',
  'biotecnologie',
  'camice',
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
  { label: 'Prove', href: '/test' },
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
  { icon: 'users', value: 150, suffix: '+', label: 'Studenti Soddisfatti' },
  { icon: 'graduation-cap', value: 89, suffix: '%', label: 'Ammessi nella Prima Scelta' },
  { icon: 'book', value: 4000, suffix: '+', label: 'Ore di Corso Svolte ad Oggi' },
  { icon: 'user', value: 20, suffix: '+', label: 'Giovani Tutor' },
];

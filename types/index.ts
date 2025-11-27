// Types for Leonardo School Next.js project

export interface NavLink {
  label: string;
  href: string;
  submenu?: NavLink[];
}

export interface TestCard {
  id: string;
  title: string;
  description: string;
  image?: string;
  images?: string[]; // Array of multiple images for cards that need multiple icons
  link: string;
  details?: string;
  dates?: {
    label: string;
    date: string;
    url?: string;
  }[];
  documents?: {
    title: string;
    url: string;
  }[];
}

export interface Testimonial {
  id: string;
  name: string;
  course: string;
  university: string;
  image: string;
  text: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface CourseInfo {
  id: string;
  title: string;
  description: string;
  duration?: string;
  type?: string;
}

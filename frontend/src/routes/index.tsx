import { createFileRoute } from '@tanstack/react-router';
import { Hero, ServicesSection, ProjectsSection, ProcessSection, AboutSection, FAQSection, ContactSection } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/')({head:()=>pageHead('Modern Websites for Modern Businesses','WebForgeStudio designs and develops clean, responsive business websites, online stores, and custom web applications. Explore the portfolio and start your project.'),component:Index});
function Index() { return <><Hero/><ServicesSection/><ProjectsSection preview/><ProcessSection/><AboutSection/><FAQSection/><ContactSection/></>; }

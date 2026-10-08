import { createFileRoute } from '@tanstack/react-router';
import { ServicesSection, ProcessSection, FAQSection, ContactSection } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/services')({head:()=>pageHead('Web Development Services','Business websites, e-commerce, landing pages, portfolio websites, custom web applications, and website redesign by WebForgeStudio.'),component:Services});
function Services(){return <><div className="container page-intro"><h1>Websites built for your goals.</h1><p>From your first business website to a custom web application, find the right fit for your next step.</p></div><ServicesSection/><ProcessSection/><FAQSection/><ContactSection/></>;}

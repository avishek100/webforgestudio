import { createFileRoute } from '@tanstack/react-router';
import { AboutSection, ProcessSection, ContactSection } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/about')({head:()=>pageHead('About the Studio','Meet the approach behind WebForgeStudio: modern design, responsive layouts, performance-focused development, and custom websites.'),component:About});
function About(){return <><div className="container page-intro"><div className="eyebrow">WebForgeStudio</div><h1>Your ideas. Thoughtfully built.</h1><p>I’m an independent web developer focused on making professional websites straightforward — and making your business look its best online.</p></div><AboutSection/><ProcessSection/><ContactSection/></>;}

import { createFileRoute } from '@tanstack/react-router';
import { ProjectsSection, ContactSection } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/projects')({head:()=>pageHead('Projects & Portfolio','Explore VIP Power Gym, Kabila Resort, and sample business, e-commerce, and portfolio projects by WebForgeStudio.'),component:Projects});
function Projects(){return <><ProjectsSection/><ContactSection/></>;}

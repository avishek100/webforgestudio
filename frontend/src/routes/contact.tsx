import { createFileRoute } from '@tanstack/react-router';
import { ContactSection, FAQSection } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/contact')({head:()=>pageHead('Contact WebForgeStudio','Have a website project in mind? Start a conversation with WebForgeStudio and discuss your business, requirements, and goals.'),component:Contact});
function Contact(){return <><ContactSection/><FAQSection/></>;}

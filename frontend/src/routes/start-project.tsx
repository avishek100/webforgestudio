import { createFileRoute } from '@tanstack/react-router';
import { RequestForm } from '@/components/portfolio/Sections';
import { pageHead } from '@/lib/portfolio';
export const Route = createFileRoute('/start-project')({head:()=>pageHead('Start Your Project','Share your website requirements, budget, and timeline with WebForgeStudio.'),component:StartProject});
function StartProject(){return <RequestForm/>;}

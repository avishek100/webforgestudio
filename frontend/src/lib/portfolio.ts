import gym from '@/assets/gym-website.jpg';
import resort from '@/assets/resort-website.jpg';
import shop from '@/assets/shop-website.jpg';
import forma from '@/assets/forma-website.jpg';
export type PortfolioImage = { id: string; url: string; alt: string };
export type Project = {
 id:string;
 name:string;
 category:string;
 image:string|null;
 description:string;
 features:string[];
 sample:boolean;
 images?:PortfolioImage[];
};
export const projects: Project[] = [
 { id:'vip-power-gym', name:'VIP Power Gym', category:'Business', image:gym, description:'A powerful gym website with workout information, a BMR calculator, and membership plans.', features:['Workout information','BMR calculator','Membership plans','Mobile-friendly design'], sample:false },
 { id:'kabila-resort', name:'Kabila Resort', category:'Business', image:resort, description:'A welcoming resort website showcasing beautiful rooms, facilities, and guest experiences.', features:['Room showcase','Facilities and services','Photo gallery','Responsive layouts'], sample:false },
 { id:'daily-ritual', name:'Daily Ritual', category:'E-commerce', image:shop, description:'A fresh online shopping experience for a modern, everyday skincare brand.', features:['Product catalog','Product details','Shopping cart interface','Mobile-first shopping'], sample:true },
 { id:'forma-studio', name:'Forma Studio', category:'Business', image:forma, description:'An editorial portfolio for an architecture studio with a focus on thoughtful spaces.', features:['Project gallery','Studio profile','Service pages','Contact interface'], sample:true },
 { id:'taskflow', name:'TaskFlow', category:'Portfolio', image:null, description:'A focused project workspace that keeps tasks, deadlines, and teams organized.', features:['Task board','Project overview','Deadline tracking','Team workspace interface'], sample:true },
];
export function pageHead(title:string, description:string) { return { meta:[{title:`${title} — WebForgeStudio`},{name:'description',content:description},{property:'og:title',content:`${title} — WebForgeStudio`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }; }

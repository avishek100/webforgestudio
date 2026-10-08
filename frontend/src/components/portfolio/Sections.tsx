import { Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Building2, ShoppingBag, PanelsTopLeft, AppWindow, RefreshCw, Check, Monitor, Zap, Fingerprint, Plus, Smartphone, CheckCircle2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { projects, type Project } from '@/lib/portfolio';
import { portalApi, portalApiUrl } from '@/lib/portal-api';
import { StartButton } from './Shell';
import { ContactOptions } from './contact-options';
export function SectionHeading({label,title,description,center=false}:{label:string;title:string;description?:string;center?:boolean}) { return <div className={`section-heading ${center?'center':''}`}><p className="section-label">{label}</p><h2>{title}</h2>{description&&<p className="section-description">{description}</p>}</div>; }
export function Hero() { return <section className="hero"><div className="container hero-layout"><div><div className="eyebrow">Web Development Studio</div><h1>Modern Websites<br/>for <span>Modern<br className="hidden lg:block"/> Businesses.</span></h1><p className="hero-description">I design and develop clean, responsive websites that help businesses build a strong online presence.</p><div className="hero-actions"><StartButton/><Button variant="outline" size="lg" asChild><Link to="/projects">View My Work <ArrowRight/></Link></Button></div><div className="hero-footnote"><CheckCircle2/> Thoughtfully designed. Built around your business.</div></div><div className="mockup-area"><div className="preview-window" aria-hidden="true"><div className="browser-bar"><i/><i/><i/><span>webforge.studio</span></div><div className="preview-body"><div className="preview-nav"><span className="preview-logo"/><span className="bar" style={{width:'38px'}}/><span className="bar" style={{width:'30px'}}/><span className="bar" style={{width:'34px'}}/><span className="preview-pill"/></div><div className="preview-hero"><div className="preview-copy"><span className="t" style={{width:'88%'}}/><span className="t" style={{width:'60%'}}/><span className="bar" style={{width:'94%'}}/><span className="bar" style={{width:'72%'}}/><div className="preview-actions"><span className="chip chip-solid"/><span className="chip chip-line"/></div></div><div className="preview-art"><span className="bar" style={{width:'56%'}}/><span className="bar" style={{width:'36%'}}/></div></div><div className="preview-cards">{[0,1,2].map(k=><div className="preview-card" key={k}><i/><span className="bar" style={{width:'62%'}}/><span className="bar" style={{width:'84%'}}/></div>)}</div></div></div><div className="mockup-caption"><Monitor/> Designed for desktop. <Smartphone/> Ready for every screen.</div></div></div></section>; }
const services=[{name:'Business Websites',description:'Professional websites for businesses and companies.',icon:Building2},{name:'E-commerce',description:'Modern online stores for selling products online.',icon:ShoppingBag},{name:'Landing Pages',description:'Clean landing pages designed around your goals.',icon:PanelsTopLeft},{name:'Portfolio Websites',description:'Personal portfolio sites that present your work with clarity.',icon:UserRound},{name:'Web Applications',description:'Custom web applications built for specific requirements.',icon:AppWindow},{name:'Website Redesign',description:'Give your outdated website a fresh, modern look.',icon:RefreshCw}];
export function ServicesSection() { return <section className="section section-tint"><div className="container"><SectionHeading label="Services" title="What I Do" description="The right website for your business. Built with care, from start to finish." center/><div className="service-grid">{services.map(({name,description,icon:Icon})=><article className="service-card" key={name}><div className="icon-tile"><Icon/></div><h3>{name}</h3><p>{description}</p></article>)}</div></div></section>; }
export function TaskThumbnail() { return <div className="task-thumbnail" role="img" aria-label="TaskFlow sample project management dashboard"><aside className="task-sidebar"><strong>▦ TaskFlow</strong><span>Overview</span><span>My projects</span><span>Team members</span><span>Settings</span></aside><div className="task-main"><h4>Website redesign</h4><div className="task-columns">{['To do','In progress','Complete'].map((c,i)=><div className="task-column" key={c}>{c}<div className="task-ticket">{['Design exploration','Build homepage','Project kickoff'][i]}<i/></div><div className="task-ticket">{['Content review','Mobile layouts','Brand assets'][i]}<i/></div></div>)}</div></div></div>; }
export function ProjectsSection({ preview = false }: { preview?: boolean }) {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const [managedProjects, setManagedProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    portalApi<{ projects: Array<Omit<Project, "image" | "features" | "sample">> }>("/api/portfolio")
      .then(({ projects: items }) => {
        if (active) {
          setManagedProjects(
            items.map((item) => ({
              ...item,
              image: item.images?.[0]?.url ?? null,
              features: [],
              sample: false,
            })),
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Portfolio projects could not be loaded.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const allProjects = [...managedProjects, ...projects];
  const categories = ["All", ...new Set(allProjects.map((project) => project.category))];
  const filtered = allProjects.filter((project) => category === "All" || project.category === category);
  const visible = preview ? filtered.slice(0, 3) : filtered;
  const selectedImages = selected?.images?.length
    ? selected.images
    : selected?.image
      ? [{ id: selected.id, url: selected.image, alt: `${selected.name} website preview` }]
      : [];

  return (
    <section className="section">
      <div className="container">
        <div className="heading-row">
          <SectionHeading
            label="Selected Projects"
            title="My Recent Work"
            description="A few websites I've brought to life. Yours could be next."
          />
          <div className="filters" aria-label="Project categories">
            {categories.map((item) => (
              <Button
                key={item}
                variant="filter"
                size="sm"
                data-active={category === item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        {loadError && (
          <p className="mb-4 text-sm text-destructive" role="status">
            Some portfolio projects could not be loaded: {loadError}
          </p>
        )}
        <div className="project-grid">
          {visible.map((project) => {
            const cover = project.images?.[0]?.url ?? project.image;
            return (
              <article className="project-card" key={project.id}>
                <div className="project-image">
                  {cover ? (
                    <img
                      src={cover.startsWith("/api/") ? portalApiUrl(cover) : cover}
                      alt={project.images?.[0]?.alt ?? `${project.name} website preview`}
                      loading="lazy"
                      width={1536}
                      height={1024}
                    />
                  ) : (
                    <TaskThumbnail />
                  )}
                </div>
                <div className="project-info">
                  <div className="project-category">{project.category}</div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="project-bottom">
                    <Button
                      variant="link"
                      className="p-0 h-7 text-xs"
                      onClick={() => setSelected(project)}
                    >
                      View Project <ArrowUpRight />
                    </Button>
                    <span className="sample-label">
                      {project.images?.length
                        ? "Portfolio project"
                        : project.sample
                          ? "Sample project"
                          : "Concept preview"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {preview && (
          <div className="section-link">
            <Button variant="outline" asChild>
              <Link to="/projects">
                Explore All Projects <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
        <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
          <DialogContent className="detail-content sm:max-w-3xl">
            {selected && (
              <>
                <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
                {selectedImages.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedImages.map((image) => (
                      <img
                        key={image.id}
                        className="detail-image"
                        src={image.url.startsWith("/api/") ? portalApiUrl(image.url) : image.url}
                        alt={image.alt}
                        loading="lazy"
                        width={1536}
                        height={1024}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-64">
                    <TaskThumbnail />
                  </div>
                )}
                {selected.sample && (
                  <p className="sample-label">Illustrative concept preview · Sample project</p>
                )}
                {selected.features.length > 0 && (
                  <>
                    <h3 className="font-bold text-sm">Features</h3>
                    <div className="detail-features">
                      {selected.features.map((feature) => (
                        <span key={feature}>
                          <Check />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <div className="detail-cta">
                  <span>Want a website like this?</span>
                  <Button asChild>
                    <Link to="/start-project" onClick={() => setSelected(null)}>
                      Start a Project <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
const process=[['Tell Me What You Need','Share your idea, business, and goals.'],['Discuss Your Requirements','We agree on the scope and the right approach.'],['I Build Your Website','Your vision becomes a thoughtful, working website.'],['Launch Your Website','Your new online presence is ready for the world.']];
export function ProcessSection() { return <section className="section section-tint"><div className="container"><SectionHeading label="The Process" title="How It Works" description="A simple process. Clear communication. No unnecessary complexity." center/><div className="process-grid">{process.map(([title,description],i)=><div className="process-step" key={title}><div className="process-number">0{i+1}</div><h3>{title}</h3><p>{description}</p></div>)}</div></div></section>; }
const benefits=[{name:'Modern Design',description:'Clean and professional websites that make a great first impression.',icon:PanelsTopLeft},{name:'Responsive',description:'Works beautifully on phones, tablets, and computers.',icon:Monitor},{name:'Fast',description:'Performance-focused development that respects your visitors’ time.',icon:Zap},{name:'Custom',description:'Built around your business, not a generic template.',icon:Fingerprint}];
export function AboutSection() { return <section className="section"><div className="container about-layout"><div><SectionHeading label="Your Development Partner" title="Why Work With Me?" description="Good websites don't need to be complicated. I focus on what matters: your business, your visitors, and a website you can be proud of."/><div className="tech-row"><span className="tag">Website Builder</span></div></div><div className="benefit-grid">{benefits.map(({name,description,icon:Icon})=><div className="benefit" key={name}><Icon/><div><h3>{name}</h3><p>{description}</p></div></div>)}</div></div></section>; }
export function TestimonialsSection() { return <section className="section section-tint"><div className="container"><SectionHeading label="Client Stories" title="Good Work. Happy Clients." description="Sample testimonials — to be replaced with real client feedback." center/><div className="testimonial-grid">{[{quote:'The website feels exactly right for our business. Clean, professional, and easy for our customers to use.',name:'Alex Morgan',role:'Business owner',initial:'AM'},{quote:'From the first conversation to the final design, everything felt clear and well thought out. A great experience.',name:'Jamie Taylor',role:'Founder',initial:'JT'},{quote:'Our new website looks beautiful on every device. It’s the online presence we were looking for.',name:'Sam Wilson',role:'Small business owner',initial:'SW'}].map(t=><article className="testimonial" key={t.name}><div className="quote-mark">“</div><blockquote>{t.quote}</blockquote><div className="testimonial-person"><div className="initial">{t.initial}</div><div><strong>{t.name}</strong><span>{t.role} · Sample testimonial</span></div></div></article>)}</div></div></section>; }
const faqs=[['How much does a website cost?','The cost depends on your pages, design, and features. Share your requirements and budget so we can discuss a tailored quote.'],['How long does a website take?','The timeline depends on the size of the project and content readiness. We’ll agree on a realistic schedule before work begins.'],['Do you build e-commerce websites?','Yes. I design and develop online stores around your products and your customers’ shopping experience.'],['Can you redesign an existing website?','Yes. I can refresh the design, improve mobile layouts, and make your existing website easier to use.'],['Can you add custom features?','Yes. We can discuss calculators, booking tools, dashboards, and other features tailored to your requirements.'],['Do you work with international clients?','Yes. Projects can be discussed and managed remotely with clear communication throughout.']];
export function FAQSection() { return <section className="section"><div className="container faq-layout"><div><SectionHeading label="A Few Answers" title="Frequently Asked Questions" description="Have something else in mind? Let's talk about your project."/><Button variant="link" className="p-0" asChild><Link to="/contact">Get in touch <ArrowRight/></Link></Button></div><div>{faqs.map(([q,a])=><details className="faq-item" key={q}><summary>{q}<Plus/></summary><p>{a}</p></details>)}</div></div></section>; }
export function ContactSection() { return <section className="contact-band"><div className="container"><SectionHeading label="Let's Create Something Great" title="Let's Work Together" description="Have a project in mind? Send me a message and let's discuss it." center/><div className="hero-actions"><StartButton/><ContactOptions/></div><ContactOptions socialOnly/></div></section>; }
export function RequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const apiBaseUrl = (import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:4000').replace(/\/+$/, '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const form = event.currentTarget;
    const payload = Object.fromEntries(
      [...new FormData(form)].map(([key, value]) => [key, String(value)]),
    );

    try {
      const response = await fetch(`${apiBaseUrl}/api/project-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let result: { message?: string; errors?: Record<string, string> };
      try {
        result = await response.json();
      } catch {
        throw new Error('The project request service returned an invalid response.');
      }

      if (!response.ok) {
        throw new Error(
          Object.values(result.errors ?? {}).join(' ') ||
            result.message ||
            'Your request could not be saved. Please try again.',
        );
      }

      form.reset();
      setSubmitted(true);
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? 'Could not connect to the project request service. Please try again later.'
          : cause instanceof Error
            ? cause.message
            : 'Your request could not be saved. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="container request-layout">
      <aside className="request-aside">
        <div className="eyebrow">Your Next Chapter</div>
        <h1>Start Your Project</h1>
        <p>Tell me a little about your business and what you have in mind. Great websites start with a conversation.</p>
        <div className="request-checks">
          <span><Check/> A website built around your goals</span>
          <span><Check/> Clear communication at every step</span>
          <span><Check/> Thoughtful design for every screen</span>
        </div>
      </aside>
      {submitted ? (
        <div className="success-state" role="status">
          <CheckCircle2/>
          <h2>Thank you for sharing your project!</h2>
          <p>Your project request has been received and saved.</p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>Create Another Request <ArrowRight/></Button>
        </div>
      ) : (
        <form className="request-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Name *</label>
            <input id="name" name="name" required autoComplete="name" placeholder="Your full name" maxLength={120}/>
          </div>
          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" maxLength={254}/>
          </div>
          <div className="form-field full">
            <label htmlFor="business">Business Name</label>
            <input id="business" name="business" autoComplete="organization" placeholder="Your business or brand" maxLength={200}/>
          </div>
          <div className="form-field full">
            <label htmlFor="service">Service Needed *</label>
            <select id="service" name="service" required defaultValue="">
              <option value="" disabled>Select a service</option>
              {['Business Website','E-commerce','Landing Page','Portfolio Website','Web Application','Website Redesign','Other'].map(service=><option key={service}>{service}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label htmlFor="description">Project Description *</label>
            <textarea id="description" name="description" required placeholder="What would you like to build? Tell me about your goals, pages, and features." maxLength={5000}/>
          </div>
          <div className="form-field">
            <label htmlFor="budget">Budget</label>
            <input id="budget" name="budget" placeholder="Amount and currency, or let's discuss" maxLength={200}/>
          </div>
          <div className="form-field">
            <label htmlFor="timeline">Preferred Timeline</label>
            <select id="timeline" name="timeline" defaultValue="">
              <option value="">Choose a timeline</option>
              <option>As soon as possible</option>
              <option>Within 1 month</option>
              <option>Within 2–3 months</option>
              <option>Flexible / let's discuss</option>
            </select>
          </div>
          <div className="form-field full">
            {error && <p className="form-note" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="justify-self-start" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Project Request'} <ArrowUpRight/>
            </Button>
            <p className="form-note">Your project details will be saved so I can review your request.</p>
          </div>
        </form>
      )}
    </section>
  );
}

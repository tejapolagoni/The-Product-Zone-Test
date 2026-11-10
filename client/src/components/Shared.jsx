import { ArrowUpRight, LoaderCircle, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SectionHeading({ eyebrow, title, action, to = '/products' }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <Link className="text-link section-action" to={to}>{action}<ArrowUpRight size={15} /></Link>}</div>;
}

export function Loading({ label = 'Finding the good stuff' }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={26} /><span>{label}...</span></div>;
}

export function EmptyState({ title = 'Nothing here just yet', message = 'Try a different search or check back soon.' }) {
  return <div className="empty-state"><span className="empty-icon"><SearchX size={23} /></span><h3>{title}</h3><p>{message}</p></div>;
}

export function ErrorState({ message, retry }) {
  return <div className="error-state"><p>{message}</p>{retry && <button className="button button-outline" onClick={retry}>Try again</button>}</div>;
}

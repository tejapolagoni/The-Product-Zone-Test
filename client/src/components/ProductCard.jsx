import { ArrowUpRight, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../lib/api.js';

export default function ProductCard({ product, number }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product._id}`} className="product-image-wrap" aria-label={`View ${product.productName} details`}>
        <img src={imageUrl(product.image)} alt={product.productName} loading="lazy" decoding="async" />
        {product.isFeatured && <span className="product-badge">OUR PICK</span>}
        <span className="product-index">{String(number || 1).padStart(2, '0')}</span>
        <span className="image-arrow"><MoveUpRight size={17} /></span>
      </Link>
      <div className="product-card-copy">
        <div className="product-kicker"><span>{product.category}</span><span>{product.brand}</span></div>
        <Link to={`/products/${product._id}`} className="product-title">{product.productName}</Link>
        <p>{product.description}</p>
        <div className="product-card-actions">
          <Link className="text-link" to={`/products/${product._id}`}>Discover <ArrowUpRight size={14} /></Link>
          <a className="amazon-link" href={product.amazonAffiliateUrl} target="_blank" rel="nofollow sponsored noreferrer">View on Amazon <ArrowUpRight size={13} /></a>
        </div>
      </div>
    </article>
  );
}

/**
 * Dynamically updates document title and SEO/OpenGraph meta tags for the active restaurant.
 */
export function updateDocumentSeo(restaurantName: string, tableNumber?: number | null) {
  if (typeof document === 'undefined') return;

  const tableSuffix = tableNumber ? ` (Table ${tableNumber})` : '';
  const pageTitle = `${restaurantName} — Digital Menu & Ordering${tableSuffix}`;
  document.title = pageTitle;

  const desc = `Browse delicious dishes, customize your meal, and order directly to your table at ${restaurantName}. Fast contactless table ordering.`;

  // Update meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', desc);

  // Update og:title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', pageTitle);
  }

  // Update og:description
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute('content', desc);
  }
}

/**
 * JsonLd — injects a JSON-LD structured data script tag into <head>.
 * Usage: <JsonLd schema={{ "@context": "https://schema.org", ... }} />
 */
export default function JsonLd({ schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

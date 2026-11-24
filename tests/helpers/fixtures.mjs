export function validCatalog() {
  return {
    site: {
      name: 'Proseo',
      title: 'Proseo: Schema.org Microdata Product Page Reference',
      tagline: 'Product pages with microdata.',
      description: 'A reference product page with nested schema.org microdata, SEO metadata, and a strict baseline.',
      canonicalUrl: 'https://example.test/proseo/',
      repositoryUrl: 'https://example.test/repository',
      createdYear: 2016,
      modernizedYear: 2026,
    },
    products: [
      {
        id: 'sample-phone',
        name: 'Sample Phone',
        brand: 'Sample Brand',
        category: 'Phones',
        description: 'A sample phone.',
        image: 'assets/images/sample-phone.svg',
        imageAlt: 'A sample phone',
        imageWidth: 320,
        imageHeight: 240,
      },
    ],
  };
}

export function page({ head = '', body = '<h1>Heading</h1>', lang = 'en' } = {}) {
  return `<!doctype html><html lang="${lang}"><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'">
<meta name="viewport" content="width=device-width">
<title>A sufficiently long page title for tests</title>
<meta name="description" content="A sufficiently long meta description used by the audit rule tests in this repository suite.">
<link rel="canonical" href="https://example.test/">
${head}</head><body>${body}</body></html>`;
}

# Human Integrity Advisory

![Status](https://img.shields.io/badge/status-active-blue)
![Focus](https://img.shields.io/badge/focus-AI%20Intervention%20%26%20Governance-003366)
![Audience](https://img.shields.io/badge/audience-Boards%20%7C%20Executives%20%7C%20Senior%20Leaders-C9B694)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-24292e)

## Overview

Human Integrity Advisory (HIA) is an independent integrity advisory for high-stakes decisions. The practice addresses a specific question most governance frameworks leave untested: **can your organisation detect, escalate, decide, and intervene before failure becomes irreversible?**

HIA operates in the gap between governance design and operational reality. Policy defines what should happen. HIA tests whether it can.

The live site is hosted at:

**https://jamessaint.github.io/Human-Integrity-Advisory/**

## What HIA Does

Three services. One question.

- **Exposure Assessment** -- One system. One scenario. A clear view of where intervention breaks.
- **Board-Level Advisory** -- Independent judgement in high-stakes decisions where internal certainty may be misleading.
- **Ongoing Integrity Oversight** -- Continued visibility across critical systems, decision structures, and intervention capability.

Engagements follow a three-stage model: **Exposure**, **Reality Testing**, **Decision Support**. Each stage produces a defined output before the next begins.

HIA uses **AGDA** (Adaptive Governance and Decision Architecture), a proprietary assessment engine that tests whether intervention is actually possible under real-world conditions of time, dependency, evidence, and control. AGDA is not a product sold to clients. It is the structured method by which HIA conducts assessments.

All advisory work is confidential and off record unless explicitly agreed otherwise in writing.

## Site Architecture

Five public pages, three legal pages, one internal reference page.

```
/
├── index.html              # Homepage -- positioning, services overview, authority chain
├── method.html             # Assessment engine, eight dimensions, three-stage engagement
├── services.html           # Three service lines with Who/Reveals/Receives structure
├── about.html              # Founder, values, independence, sectors
├── contact.html            # Enquiry form (Formspree)
├── terms.html              # Terms and conditions
├── privacy.html            # Privacy policy
├── gdpr.html               # GDPR statement
├── brand-sheet.html        # Internal brand reference (noindex)
├── hia.css                 # Site styles
├── hia.js                  # Reveal animations, counter animations, hamburger menu
├── robots.txt              # Crawl directives
├── sitemap.xml             # Public page index
└── assets/
    ├── images/
    │   ├── favicons/       # Favicon set and webmanifest
    │   ├── logo/           # Logo variants (SVG, PNG, AI)
    │   ├── linkedin/       # LinkedIn-formatted brand assets
    │   ├── hero-bg.png     # Homepage hero background
    │   └── hero-bg.jpg     # Homepage hero background (fallback)
    └── og/
        └── og-home.png     # Open Graph image (1200x630)
```

## Brand and Design

- **Typeface**: Montserrat (300, 400, 500, 600, 700, 800)
- **Surfaces**: Black `#000000`, Page BG `#0a0a0a`, Surface `#141414`, Surface2 `#1c1c1c`
- **Accent**: Gold `#C9B694`
- **Text**: Primary `#f0f0f0`, Body `#c8c6c4`, Sub `#a8a5a2`, Faint `#797673`
- **Design**: Dark, minimal, architecturally sharp. No rounded corners, no gradients, no decorative flourishes.
- **Voice**: Board-grade. No em dashes, no exclamation marks. Calm, authoritative, concrete. Sceptical of false control.
- **No build process or framework dependencies**. Plain HTML, CSS, and vanilla JavaScript only.

Full brand token reference is in `brand-sheet.html`.

## SEO and Metadata

Every public page includes:

- Unique `<title>` and meta description
- Canonical URL pointed to `jamessaint.github.io/Human-Integrity-Advisory`
- `index, follow` robots directive on public pages; `noindex, nofollow` on legal and utility pages
- Full Open Graph tag set (og:title, og:description, og:url, og:image, og:image:alt)
- Twitter/X card tags (summary_large_image)
- JSON-LD structured data appropriate to each page type
- Favicon set, webmanifest, and theme-color

OG images are served from `assets/og/` and should be 1200x630px PNG.

## Local Development

```bash
git clone https://github.com/jamessaint/Human-Integrity-Advisory.git
```

Open any HTML file directly in a browser. No tooling, build step, or local server required.

For live reload during development, any static file server works:

```bash
npx serve .
```

## Deployment

Changes pushed to the `main` branch publish automatically via GitHub Pages to:

**https://jamessaint.github.io/Human-Integrity-Advisory/**

When a custom domain is configured, update all canonical URLs, OG URLs, schema URLs, `robots.txt`, and `sitemap.xml` to reflect the new domain before going live.

## License

All content is proprietary to **James Saint**. Viewing is permitted. Reuse, reproduction, or redistribution is not permitted without explicit written consent.

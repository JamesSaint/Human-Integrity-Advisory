# Human Integrity Advisory

![Status](https://img.shields.io/badge/status-active-blue)
![Focus](https://img.shields.io/badge/focus-AI%20Intervention%20%26%20Governance-003366)
![Audience](https://img.shields.io/badge/audience-Boards%20%7C%20Executives%20%7C%20Senior%20Leaders-C9B694)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-24292e)

## Overview

Human Integrity Advisory (HIA) is an independent advisory practice focused on a specific and underserved question: **can your organisation actually intervene when an AI-driven system fails?**

Most AI governance programmes produce policy frameworks that define what *should* happen. HIA operates in the space that governance design cannot reach — the moment of live system failure — assessing whether the people responsible for oversight can identify, escalate, and act under real operational conditions.

The live site is hosted at:

**https://jamessaint.github.io/Human-Integrity-Advisory/**

This repository provides the public website codebase, deployed via GitHub Pages.

## What HIA Does

Governance frameworks define intent. HIA tests whether that intent can be enacted.

Three focused service lines:

- **Boardroom Integrity Advisory** — Senior advisory to boards and executive leadership on whether they have the clarity, information, and authority to act when AI governance is tested.
- **Intervention & Decision Architecture Review** — Structured assessment of escalation, override, and authority in AI-dependent operations. We identify where the architecture fails before a system event does.
- **Executive Intervention Labs** — Facilitated scenario-based work with senior leadership, structured to expose genuine inability to act — and to leave leadership materially better equipped.

All advisory work is confidential and off record unless explicitly agreed otherwise in writing.

## Repository Structure

```
/
├── index.html                  # Homepage
├── about.html                  # About HIA
├── services.html               # Service lines and engagement model
├── contact.html                # Enquiry form
├── terms.html                  # Terms and conditions
├── privacy.html                # Privacy policy
├── gdpr.html                   # GDPR statement
├── brand-sheet.html            # Internal brand reference (noindex)
├── style.css                   # Site styles
├── robots.txt                  # Crawl directives
├── sitemap.xml                 # Public page index
└── assets/
    └── images/
        ├── favicons/           # Favicon set and webmanifest
        ├── logo/               # Logo variants (SVG, PNG, AI)
        └── linkedin/           # LinkedIn-formatted brand assets
```

## Brand and Design

- **Typeface**: Montserrat (300, 400, 500, 600, 700, 800)
- **Surfaces**: Black `#000000`, Page BG `#0a0a0a`, Surface `#141414`
- **Accent**: Gold `#C9B694`
- **Design principle**: Dark, minimal, architecturally sharp — no rounded corners, no gradients, no decorative flourishes
- **No build process or framework dependencies** — plain HTML, CSS, and vanilla JavaScript only

Full brand token reference is in `brand-sheet.html`.

## SEO and Metadata

Every public page includes:

- Unique `<title>` and meta description
- Canonical URL pointed to `jamessaint.github.io/Human-Integrity-Advisory`
- `index, follow` robots directive on public pages; `noindex, nofollow` on utility pages
- Full Open Graph tag set (og:title, og:description, og:url, og:image, og:image:alt)
- Twitter/X card tags
- JSON-LD structured data appropriate to each page type
- Favicon set, webmanifest, and theme-color

OG images are served from `assets/og/` and must be 1200×630px PNG. See `06_OG_IMAGE_BRIEF.md` in the associated SEO bundle for design specifications.

The sitemap at `sitemap.xml` lists the four canonical public pages only. Utility pages (terms, privacy, gdpr) are excluded.

## Local Development

```bash
git clone https://github.com/jamessaint/Human-Integrity-Advisory.git
```

Open any HTML file directly in a browser. No tooling, build step, or local server required.

## Deployment

Changes pushed to the `main` branch publish automatically via GitHub Pages to:

**https://jamessaint.github.io/Human-Integrity-Advisory/**

When a custom domain is configured, update all canonical URLs, OG URLs, schema URLs, `robots.txt`, and `sitemap.xml` to reflect the new domain before going live.

## Roadmap

- OG image set (`assets/og/`) — specs defined, images pending production
- Advisory briefs section for published governance insights
- Board-ready one-page summary document
- Governance maturity diagnostic tool
- Anonymised case study references

## License

All content is proprietary to **James Saint**. Viewing is permitted. Reuse, reproduction, or redistribution is not permitted without explicit written consent.

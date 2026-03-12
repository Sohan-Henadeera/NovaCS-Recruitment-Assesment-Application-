# NovaCS — Recruitment Assessment Platform

> A full-stack web platform that lets hiring teams issue access codes, assess candidates at scale, and make smarter shortlist decisions — all without spreadsheets or manual scoring.


## What It Does

NovaCS is a purpose-built recruitment tool with two dedicated portals:

For Recruiters & Hiring Teams
- Create an organisation, configure weighted skill categories, and set a pass threshold tailored to the role
- Issue unique, single-use access codes to candidates individually or in bulk via CSV upload
- Review a live dashboard of ranked candidate scores with full category breakdowns
- Move candidates through the hiring pipeline (shortlist, reject, hold) in one click
- View batch analytics — pass rates, score distributions, completion trends
- Export results to CSV for reporting or ATS upload
- Multi-recruiter team support with role-based permissions (Admin, Recruiter, Viewer)

For Candidates
- Enter their unique access code and verify identity with the last 4 digits of their registered phone number
- Complete a timed, multi-section assessment locked to a single device session
- Tab-switching is detected and flagged to the recruiter automatically (anti-cheat)
- Receive a confirmation screen on submission

---

## Tech Stack

| Layer | Technology |

| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Custom CSS design system with CSS variables |
| Routing | URL parameter-driven page logic (`?type=`, `?id=`) |
| Data Layer | Modular JS data store (`data.js`) — drop-in ready for a real API |
| Deployment | Vercel (static hosting + serverless functions) |
| Security Headers | CSP, HSTS, X-Frame-Options, XSS Protection, Referrer Policy |
| Font Stack | Playfair Display (serif headings) + Figtree (body) |

---

## What I Learnt

- Design systems at scale — building a full CSS variable architecture that keeps a multi-page app visually consistent without a framework
- URL-parameter driven UI — a single `error.html` handles six different error states via `?type=` params, keeping the codebase clean and DRY
- sessionStorage for state handoff — passing assessment result data between pages without a backend using `sessionStorage`
- Security hardening for static sites — configuring a full set of HTTP security headers in `vercel.json` (CSP, HSTS, X-Frame-Options, Permissions-Policy) to protect a frontend-only deployment
- Role-based UI design — building interfaces that adapt their available actions based on the logged-in user's permissions
- Anti-cheat mechanics — implementing tab-switch detection and single-use session locking at the frontend level
- Product thinking -  designing a full user journey across two distinct user types (recruiter and candidate) with appropriate flows, error states, and confirmation screens for every path

---

## Use Cases

- SMEs & startups running high-volume hiring campaigns who need a structured, consistent assessment process without enterprise software costs
- Recruitment agencies managing multiple client organisations and candidate pools simultaneously
- University careers services running graduate assessment days at scale
- HR teams replacing inconsistent, manual phone screening with objective, weighted scoring

---

## Author

**Sohan Henadeera**
[LinkedIn](https://www.linkedin.com/in/sohan-henadeera-155040259/) · [GitHub](https://github.com/Sohan-Henadeera) · sohan.henad@gmail.com

*Open source. If you use or build upon this project, please credit the original author and link back to this repository.*
*All information within the application is fictitious and has been created solely for demonstration and assessment purposes. It does not represent real individuals, organisations, or recruitment data.*

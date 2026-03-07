# NovaCS — Platform File Structure

## Folder Structure

```
novaCS/
├── index.html                  ← Landing page (v4 app — rename/replace)
│
├── css/
│   └── base.css                ← Shared variables, buttons, forms, layout
│
├── js/
│   ├── utils.js                ← Toast, modal, clipboard, sidebar, helpers
│   └── data.js                 ← Mock data store — candidates, orgs, sections
│
└── pages/
    ├── contact.html            ← Public: Contact & Demo Request form
    ├── candidate-profile.html  ← Recruiter: Full candidate profile page
    ├── invite-manager.html     ← Recruiter: Batch invite manager
    ├── submitted.html          ← Applicant: Assessment submitted confirmation
    ├── password-reset.html     ← Shared: Forgot / reset password flow
    └── error.html              ← All error states (single file, URL param driven)
```

---

## Error Page Usage

`error.html` handles all error states via a `?type=` URL parameter:

| URL | Error shown |
|-----|-------------|
| `error.html?type=code` | Access code invalid / expired |
| `error.html?type=identity&attempts=2` | Identity mismatch (pass attempt count) |
| `error.html?type=locked` | Account locked after max attempts |
| `error.html?type=timeout` | Session / timer expired |
| `error.html?type=login&attempts=1` | Invalid recruiter login |
| `error.html?type=404` | Page not found |

---

## Candidate Profile Usage

`candidate-profile.html` reads a `?id=` URL parameter to load a candidate:

```
candidate-profile.html?id=1    → Maya Patel
candidate-profile.html?id=2    → James Okafor
candidate-profile.html?id=3    → Sophie Tan (flagged)
candidate-profile.html?id=6    → Alex Chen (pending)
```

All candidate data lives in `js/data.js`. Replace with API calls in production.

---

## Submitted Page

`submitted.html` reads from `sessionStorage` key `novaCS_submission`:

```js
sessionStorage.setItem('novaCS_submission', JSON.stringify({
  name:     'Alex Chen',
  answered: 25,
  time:     '18:42',
  sections: 4,
  org:      'Acme Corp',
  flagged:  false
}));
```

Set this in the assessment JS before redirecting to `submitted.html`.

---

## Linking Into v4

Add these links to the v4 recruiter dashboard sidebar:

```html
<!-- In sidebar nav -->
<a href="pages/invite-manager.html"     data-page="invite">📨 Invite Manager</a>

<!-- On each candidate row -->
<a href="pages/candidate-profile.html?id=1">View profile →</a>

<!-- On login error -->
window.location.href = 'pages/error.html?type=login&attempts=1';

<!-- Forgot password link -->
<a href="pages/password-reset.html">Forgot password?</a>

<!-- On applicant code failure -->
window.location.href = 'pages/error.html?type=code&attempts=1';

<!-- After assessment submit -->
sessionStorage.setItem('novaCS_submission', JSON.stringify({...}));
window.location.href = 'pages/submitted.html';

<!-- Public contact page -->
<a href="pages/contact.html">Request a demo</a>
```

---

## CSS Variables (base.css)

All colours and spacing use CSS custom properties. Key ones:

```css
--navy-700:   #1e3a5f   /* Primary navy */
--navy-600:   #2452a0   /* Accent blue */
--slate-900:  #1c2333   /* Primary text */
--slate-400:  #94a3b8   /* Muted text */
--bg:         #f0f2f7   /* Page background */
--success:    #0f6b3a
--danger:     #991b1b
--warning:    #854d0e
```

---

## Pages Still To Build (from site flow)

| ID  | Page | Priority |
|-----|------|----------|
| R9  | Analytics & Reports | Future phase |
| R10 | Assessment Customisation / Question Bank | Future phase |
| S5  | Mobile / tablet warning | Future phase |
| —   | Admin Super-Panel | Next sprint |

# Hussnain Sohail — Portfolio

A single-page, dark-mode interactive portfolio with a scroll-driven,
cursor-reactive centerpiece: a portrait that morphs from a photograph
into a liquid-chrome sculpture, then dissolves into a field of code
fragments.

No build step. No dependencies to install. Pure HTML/CSS/JS + Three.js
and GSAP loaded from CDN.

## Files

```
index.html      → structure + content
style.css       → all styling, both themes
portrait.js     → the Three.js morphing portrait engine
main.js         → nav, theme toggle, scroll reveals
assets/portrait.jpg → your photo, used by the 3D centerpiece
```

## Run it locally

Because the portrait loads via `fetch`/texture load, open it through a
local server rather than double-clicking the file (browsers block
local file reads otherwise):

```bash
# from inside this folder
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it on GitHub

```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Make it live with GitHub Pages (free hosting)

1. On GitHub, open the repo → **Settings → Pages**.
2. Under "Build and deployment", set **Source** to `Deploy from a branch`.
3. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
4. Wait ~1 minute — your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

## Customizing

- **Contact email** — edit the `mailto:` link in `index.html` (Contact section).
- **Projects** — each project is one `<article class="project-row">` block
  in `index.html`; duplicate the pattern to add more.
- **Colors** — all tokens live at the top of `style.css` under `:root`
  and `body.light`.
- **Portrait** — swap `assets/portrait.jpg` for a higher-res photo any
  time; the shader re-samples it automatically.

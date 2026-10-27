# archiemonge — website

A fast, static site built to get bookings. No build step, no frameworks: plain HTML, CSS and JavaScript.

**Everything you'll want to change lives in [`content.yaml`](content.yaml).** The pages read it when they load.

```
content.yaml        ← edit this: bio, clips, socials, form messages
netlify/functions/gigs.mjs ← reads your Google "Gigs" calendar (no need to touch)
images/             ← your photos (hero, press shots, clip thumbnails, og-image.png)
videos/             ← self-hosted .mp4 clips (optional)
press/              ← optional press-kit .zip
index.html, about.html, clips.html, gigs.html, book.html, 404.html
assets/css/styles.css   ← design (brand colours are at the top)
assets/js/main.js       ← reads content.yaml and builds the page (no need to touch)
netlify.toml / vercel.json  ← hosting settings
```

---

## Edit content

1. Open `content.yaml` in any text editor (or directly on GitHub: click the file, then the pencil icon).
2. Change the text between the quotes. Every section has notes (lines starting with `#`) explaining each field.
3. Save / commit. If the site is connected to GitHub, Netlify or Vercel republishes it in about 30 seconds.

**Golden rules:** indent with 2 spaces (never Tab), and keep the `-` at the start of list items.
If the site suddenly shows blank sections, you've probably broken the YAML. Paste the file into
[yamllint.com](https://www.yamllint.com) and it'll point at the line. When you preview on your own
computer, a red box at the bottom of the page also tells you what's wrong.

## Gigs from Google Calendar

Your upcoming gigs come straight from Google Calendar. Add a show to your calendar and the site
updates by itself (within about 15 minutes; Google sometimes takes a little longer to publish changes).
Past dates disappear automatically. If there are none coming up, the Gigs page shows a
"book me instead" message (edit it under `gigs_empty:` in `content.yaml`).

### One-time setup (10 minutes)

1. **Make a "Gigs" calendar.** In Google Calendar on a computer: ⚙️ Settings → *Add calendar* →
   *Create new calendar* → name it `Gigs`. Only public shows go in here, so nothing private
   (personal plans, fees, unannounced dates) ever reaches the website.
2. **Move your upcoming shows into it.** Open each gig → change the calendar dropdown to *Gigs* → Save.
3. **Copy its secret address.** ⚙️ Settings → click *Gigs* in the left list → *Integrate calendar* →
   copy **Secret address in iCal format** (ends in `basic.ics`). Treat it like a password: don't post it
   or paste it into any file in this folder.
4. **Give it to Netlify.** Netlify → your site → *Site configuration* → *Environment variables* →
   *Add a variable*: key `GIGS_ICAL_URL`, value = the address you copied.
   Optional: `GIGS_TIMEZONE`, e.g. `Europe/London`, if the times on the site come out wrong
   (by default it uses your Google Calendar's time zone).
5. **Redeploy:** *Deploys* → *Trigger deploy* → *Deploy site*. Visit `your-site/api/gigs` and you
   should see your gigs listed as text.

### How to write a gig in the calendar

| Calendar field | What to put | Shows on the site as |
|---|---|---|
| **Title** | The venue or night: `Frog & Bucket` | The gig's name |
| **Date & start time** | When you're on (or an all-day event if unsure) | `Sat 14 Nov · 7:30pm` |
| **Location** | `Manchester, UK` (a full Google Maps address also works) | `Manchester, UK` |
| **Description** | Paste the ticket link | A **Tickets** button |
| Description, optional | A line `Note: Headlining` | A small label |
| Description, optional | The words `sold out` | **Sold out** instead of Tickets |

Only those three things are read from the description, so anything else you write there stays private.
Cancelled events are skipped. Repeating events only show their first date, so add each date separately.

### Adding a gig by hand instead

You can still list gigs in `content.yaml` under `gigs:` (there's an example in the file). They show
alongside the calendar ones, and if the same date and venue is in both, the `content.yaml` version wins,
which is handy for fixing details. The calendar only works on Netlify, so on Vercel or in the local
preview, only the `content.yaml` gigs show.

## Add a clip

Copy an entry in `clips:` and paste the normal share link:

```yaml
  - type: youtube        # youtube | tiktok | instagram | mp4
    url: "https://www.youtube.com/watch?v=XXXXXXXXXXX"
    title: "Ten minutes at The Comedy Store"
    venue: "The Comedy Store"   # optional
    duration: "10:12"           # optional
```

- **YouTube**: thumbnail is automatic. Shorts links are shown vertically.
- **TikTok / Instagram Reels**: add a `poster:` image (screenshot a nice frame, save it in `images/`). Without one, a plain dark tile shows.
- **Your own .mp4**: put the file in `videos/`, use `type: mp4` and `url: "videos/yourfile.mp4"`. Add `vertical: true` if it's portrait.
- Add `featured: true` to ONE clip to make it the big clip on the home page.

Nothing loads from YouTube/TikTok/Instagram until a visitor presses play, so the page stays fast no matter how many clips you add.

## Swap the photos

Put your photos in `images/` and update the paths in `content.yaml`:

| Where | Field | Best size |
|---|---|---|
| Home page banner | `hero.image` | Landscape, ~2000 × 1250, under 400 KB |
| About page portrait | `about.photo` | Portrait 4:5, ~1200 × 1500 |
| Press kit | `press_kit.photos` → `file` | Full-resolution originals (these get downloaded) |
| Press kit preview (optional) | `press_kit.photos` → `preview` | Same photo, ~800px wide, to keep the page fast |

Compress JPGs before uploading (free: [squoosh.app](https://squoosh.app)). Use `hero.image_focus` to
keep your face in shot when the photo is cropped on phones.

**Sharing preview** (`images/og-image.png`, 1200 × 630) is what shows when someone pastes your link
into WhatsApp, LinkedIn or iMessage. A simple text version is included; a version with a stage photo
works even better. Keep the same filename.

---

## Preview on your computer

The site has to be served (opening the HTML file directly won't load `content.yaml`). In this folder run:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. (The booking form only actually sends once it's live on Netlify or Formspree.)

## Deploy (free)

### Option A — Netlify (recommended: the booking form works with zero setup)

1. Put this folder on GitHub (github.com → New repository → upload files), **or** skip GitHub and drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
2. In Netlify: **Add new site → Import from Git**, pick the repo. Leave build command empty, publish directory `.`.
3. **Turn on form emails:** Site configuration → Forms → enable form detection, redeploy once, then
   Forms → Form notifications → Add notification → Email → `archiescomedy@gmail.com`.
   Spam is filtered by a hidden honeypot field plus Netlify's own spam filter.
4. Add your domain: Domain management → Add a domain.

### Option B — Vercel (or any other host)

1. Create a free form at [formspree.io](https://formspree.io) with your email; copy the form ID (the bit after `/f/`).
2. Paste it into `content.yaml` → `booking.formspree_id`.
3. On [vercel.com](https://vercel.com): **Add New → Project**, import the GitHub repo, framework preset "Other", no build command. Deploy.

### After you have a domain

Find and replace `YOUR-DOMAIN.com` across the whole folder (most editors: Cmd+Shift+H / Ctrl+Shift+H).
It's in every `.html` file, `content.yaml`, `sitemap.xml` and `robots.txt`. Then submit
`https://your-domain/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

---

## Design notes

- **Brand colours**: navy blue, royal green and charcoal, set at the top of `assets/css/styles.css`: `--navy` (dark sections), `--accent` (royal green: buttons and highlights), `--accent-bright` (a lighter green for use on navy) and `--ink` (charcoal text).
- **Fonts**: Archivo (headings and wordmark) and Inter (body text), from Google Fonts.
- **Wordmark**: your name in Archivo Condensed Black with a small accent square. It's text, so it stays sharp everywhere. The favicon is `favicon.svg`.
- **Pronouns**: the sample bios avoid pronouns. Add yours when you rewrite them.
- **Accessibility**: skip link, keyboard-friendly menu and players, visible focus, labelled form with friendly error messages, reduced-motion support.
- **SEO**: page titles and descriptions, Open Graph and Twitter cards, schema.org `Person` on every page, and `ComedyEvent` entries for each upcoming gig.

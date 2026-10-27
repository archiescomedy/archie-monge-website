/* =====================================================================
   Archie Monge — site script
   Reads /content.yaml and fills in every page. To change what the site
   SAYS, edit content.yaml — you shouldn't need to touch this file.
   ===================================================================== */
(function () {
  'use strict';

  var TESTIMONIAL_LABELS = {
    promoter: 'Promoter', industry: 'Industry', client: 'Event client', press: 'Press', audience: 'Audience'
  };
  var PLATFORM_NAMES = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', mp4: 'Video' };

  var ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="fill" cx="17.5" cy="6.5" r="1.1"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.7 2.2 4.6 5 4.9"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path class="fill" d="M10 9.3v5.4l4.6-2.7z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.8c0-1 .3-1.8 1.8-1.8H18V3a24 24 0 0 0-2.7-.1C12.8 2.9 11 4.4 11 7.3v2.2H8V13h3v8"/>',
    threads: '<path d="M16.5 11.2c-.3-3-2-4.4-4.4-4.4-2 0-3.5 1-4 2.6"/><path d="M8.5 15.5c.4 1.5 1.9 2.4 3.7 2.2 2.2-.2 3.6-1.8 3.6-4.6 0-.6 0-1.2-.2-1.7-1.2-.5-2.7-.7-4.2-.5-1.8.3-2.9 1.3-2.9 2.5"/><circle cx="12" cy="12" r="9.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };

  // ---------- helpers ----------
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function list(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
  // "images/x.jpg" → "/images/x.jpg" so paths work on every page (incl. the 404 page)
  function asset(p) {
    if (!p) return '';
    p = String(p).trim();
    return /^(https?:)?\/\//.test(p) || p.charAt(0) === '/' ? p : '/' + p;
  }
  function paragraphs(text) {
    return String(text || '').trim().split(/\n\s*\n/).filter(Boolean).map(function (p) {
      return '<p>' + esc(p.replace(/\s*\n\s*/g, ' ')) + '</p>';
    }).join('');
  }
  function plainText(text) {
    return String(text || '').trim().split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' '); }).join('\n\n');
  }
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.link) + '</svg>';
  }
  // YAML turns 2026-11-14 into a Date (in UTC). Treat every gig date as a plain local calendar day.
  function parseDate(v) {
    if (v instanceof Date) return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
    var m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- load content ----------
  function loadContent() {
    if (typeof window.jsyaml === 'undefined') return Promise.reject(new Error('The YAML reader (js-yaml) did not load.'));
    return fetch('/content.yaml', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('Could not fetch /content.yaml (' + res.status + ')');
      return res.text();
    }).then(function (text) { return window.jsyaml.load(text) || {}; });
  }

  function showContentError(err) {
    console.error('[site] content.yaml problem:', err);
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    var box = document.createElement('div');
    box.className = 'content-error';
    box.setAttribute('role', 'alert');
    box.textContent = 'content.yaml has a problem (only you see this message, on your computer):\n' + (err && err.message ? err.message : err);
    document.body.appendChild(box);
  }

  // ---------- generic bindings ----------
  function applyBindings(c) {
    $$('[data-bind]').forEach(function (el) {
      var v = get(c, el.dataset.bind);
      if (v != null && v !== '') el.textContent = String(v).trim();
      else if (!el.textContent.trim()) el.hidden = true;
    });
    $$('[data-bind-src]').forEach(function (el) {
      var v = get(c, el.dataset.bindSrc);
      if (v) el.src = asset(v);
      if (el.dataset.bindAlt) el.alt = get(c, el.dataset.bindAlt) || '';
    });
    $$('[data-slot="paragraphs"]').forEach(function (el) { el.innerHTML = paragraphs(get(c, el.dataset.path)); });
    $$('[data-requires]').forEach(function (el) {
      var v = get(c, el.dataset.requires);
      if (!v || (Array.isArray(v) && !list(v).length)) el.hidden = true;
    });

    var email = get(c, 'contact.email');
    if (email) {
      $$('[data-email]').forEach(function (el) {
        el.href = 'mailto:' + email;
        if (el.dataset.email === 'text') el.textContent = email;
      });
    }
  }

  // ---------- socials ----------
  function renderSocials(c) {
    var socials = list(get(c, 'contact.socials'));
    $$('[data-slot="socials"]').forEach(function (el) {
      if (!socials.length) { el.hidden = true; return; }
      el.innerHTML = socials.map(function (s) {
        var label = s.label || s.platform || 'Link';
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + icon(String(s.platform || '').toLowerCase()) +
          '<span>' + esc(label) + '</span>' + (s.handle ? '<span class="socials__handle">' + esc(s.handle) + '</span>' : '') + '</a></li>';
      }).join('');
    });
  }

  // ---------- hero + credits ----------
  function renderHero(c) {
    var el = $('[data-slot="hero"]');
    var h = c.hero || {};
    if (!el || !h.image) return;
    var img = $('.hero__img', el);
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    img.alt = h.image_alt || '';
    // Phones get the tighter crop (image_mobile) if there is one.
    var phone = window.matchMedia('(max-width: 719px)');
    var pick = function () {
      var usePhone = phone.matches && h.image_mobile;
      img.style.objectPosition = usePhone ? 'center' : (h.image_focus || 'center');
      img.src = asset(usePhone ? h.image_mobile : h.image);
    };
    pick();
    phone.addEventListener('change', pick);
    if (img.complete) img.classList.add('is-loaded');
  }

  function renderCredits(c) {
    $$('[data-slot="credits"]').forEach(function (el) {
      var cr = c.credits || {};
      var stats = list(cr.stats).map(function (s) {
        return '<div class="stat"><span class="stat__value">' + esc(s.value) + '</span><span class="stat__label">' + esc(s.label) + '</span></div>';
      }).join('');
      var venues = list(cr.venues).map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('');
      if (!stats && !venues) { el.hidden = true; return; }
      el.innerHTML = '<div class="container credits__inner">' +
        (stats ? '<div class="stats">' + stats + '</div>' : '') +
        (venues ? '<div class="venues"><p class="venues__label">' + esc(cr.venues_label || 'Played') + '</p><ul class="venues__list">' + venues + '</ul></div>' : '') +
        '</div>';
    });
  }

  // ---------- clips ----------
  function parseClip(clip) {
    var type = String(clip.type || '').toLowerCase().trim();
    var url = String(clip.url || clip.id || '').trim();
    var out = { type: type, title: clip.title || 'Clip', vertical: clip.vertical === true, poster: asset(clip.poster), embed: '' };
    var m;
    if (type === 'youtube') {
      m = url.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{6,})/);
      var id = m ? m[1] : url;
      if (/shorts\//.test(url) && clip.vertical !== false) out.vertical = true;
      out.embed = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1';
      if (!out.poster) out.poster = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
    } else if (type === 'tiktok') {
      m = url.match(/video\/(\d+)/);
      out.vertical = true;
      out.embed = 'https://www.tiktok.com/player/v1/' + encodeURIComponent(m ? m[1] : url) + '?autoplay=1&rel=0';
    } else if (type === 'instagram') {
      m = url.match(/\/(?:reel|reels|p|tv)\/([\w-]+)/);
      out.vertical = true;
      out.embed = 'https://www.instagram.com/reel/' + encodeURIComponent(m ? m[1] : url) + '/embed/';
    } else if (type === 'mp4') {
      out.embed = asset(url);
    }
    return out;
  }

  function clipCard(raw, large) {
    var c = parseClip(raw);
    if (!c.embed) return '';
    var platform = PLATFORM_NAMES[c.type] || 'Video';
    var info = [raw.venue, raw.duration].filter(Boolean).map(esc).join(' · ');
    var media;
    if (c.type === 'mp4') {
      media = '<video controls preload="none" playsinline' + (c.poster ? ' poster="' + esc(c.poster) + '"' : '') + '>' +
        '<source src="' + esc(c.embed) + '" type="video/mp4">Sorry, your browser can’t play this video.</video>';
    } else {
      media = '<button type="button" class="clip__play" data-embed="' + esc(c.embed) + '" data-title="' + esc(c.title) + '" aria-label="Play: ' + esc(c.title) + ' (' + platform + ')">' +
        (c.poster ? '<img src="' + esc(c.poster) + '" alt="" loading="lazy" decoding="async">' : '<span class="clip__noposter"></span>') +
        '<span class="clip__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></span>' +
        '<span class="clip__platform" aria-hidden="true">' + platform + '</span></button>';
    }
    return '<article class="clip clip--' + (c.vertical ? 'vertical' : 'wide') + (large ? ' clip--large' : '') + ' reveal">' +
      '<div class="clip__media">' + media + '</div>' +
      '<div class="clip__meta"><h3 class="clip__title">' + esc(c.title) + '</h3>' +
      (info ? '<p class="clip__info">' + info + '</p>' : '') +
      (large && raw.description ? '<p class="clip__desc">' + esc(raw.description) + '</p>' : '') +
      '</div></article>';
  }

  function renderClips(c) {
    var clips = list(c.clips);

    $$('[data-slot="featured-clip"]').forEach(function (el) {
      var featured = clips.filter(function (x) { return x.featured; })[0] || clips[0];
      if (!featured) { el.closest('section').hidden = true; return; }
      el.innerHTML = clipCard(featured, true);
    });

    $$('[data-slot="clips"]').forEach(function (el) {
      if (!clips.length) {
        el.innerHTML = emptyState('Clips coming soon.', 'In the meantime, the best way to see the act is live, or in your venue.', true);
        return;
      }
      var sets = clips.filter(function (x) { return !parseClip(x).vertical; });
      var shorts = clips.filter(function (x) { return parseClip(x).vertical; });
      var both = sets.length && shorts.length;
      function group(items, title, kind) {
        if (!items.length) return '';
        return '<div class="clip-group">' + (both ? '<h2 class="clip-group__title">' + title + '</h2>' : '') +
          '<div class="clip-grid clip-grid--' + kind + '">' + items.map(function (x) { return clipCard(x); }).join('') + '</div></div>';
      }
      el.innerHTML = group(sets, 'Sets', 'wide') + group(shorts, 'Shorts', 'short');
    });
  }

  // Click-to-load: the third-party player only loads when someone presses play.
  function setupClipPlayers() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.clip__play');
      if (!btn) return;
      var frame = document.createElement('iframe');
      frame.src = btn.dataset.embed;
      frame.title = btn.dataset.title || 'Video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(frame);
      frame.focus();
    });
  }

  // ---------- gigs ----------
  // Gigs from the Google "Gigs" calendar (netlify/functions/gigs.mjs).
  // Anywhere the function isn't running (e.g. local preview) this quietly returns nothing.
  function loadCalendarGigs() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch('/api/gigs', { cache: 'no-cache', signal: ctrl && ctrl.signal })
      .then(function (res) {
        var isJson = /json/.test(res.headers.get('content-type') || '');
        return res.ok && isJson ? res.json() : { gigs: [] };
      })
      .then(function (data) { return Array.isArray(data.gigs) ? data.gigs : []; })
      .catch(function () { return []; })
      .then(function (gigs) { clearTimeout(timer); return gigs; });
  }

  // content.yaml gigs win if the same date + venue is in both.
  function mergeGigs(fromFile, fromCalendar) {
    var key = function (g) {
      var d = parseDate(g.date);
      return (d ? isoDate(d) : '') + '|' + String(g.venue || '').trim().toLowerCase();
    };
    var seen = {};
    fromFile.forEach(function (g) { seen[key(g)] = true; });
    return fromFile.concat(fromCalendar.filter(function (g) { return !seen[key(g)]; }));
  }

  function upcomingGigs(c) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return list(c.gigs).map(function (g) { return Object.assign({}, g, { _d: parseDate(g.date) }); })
      .filter(function (g) { return g._d && g._d >= today; })
      .sort(function (a, b) { return a._d - b._d; });
  }

  function gigItem(g, locale) {
    var d = g._d;
    var thisYear = d.getFullYear() === new Date().getFullYear();
    var weekday = d.toLocaleDateString(locale, { weekday: 'short' }) + (thisYear ? '' : ' ' + d.getFullYear());
    var place = [g.city, g.country].filter(Boolean).map(esc).join(', ') + (g.time ? ' · ' + esc(g.time) : '');
    var dateLabel = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    var action;
    if (g.sold_out) action = '<span class="tag tag--dark">Sold out</span>';
    else if (g.ticket_url) action = '<a class="btn btn--outline btn--sm" href="' + esc(g.ticket_url) + '" target="_blank" rel="noopener">' +
      esc(g.ticket_label || 'Tickets') + '<span class="sr-only"> for ' + esc(g.venue) + ' on ' + esc(dateLabel) + '</span></a>';
    else action = '<span class="gig__soon">Tickets soon</span>';
    return '<li class="gig reveal">' +
      '<time class="gig__date" datetime="' + isoDate(d) + '">' +
      '<span class="gig__day">' + d.getDate() + '</span>' +
      '<span class="gig__month">' + esc(d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')) + '</span>' +
      '<span class="gig__weekday">' + esc(weekday) + '</span></time>' +
      '<div class="gig__body"><h3 class="gig__venue">' + esc(g.venue) + '</h3>' +
      (place ? '<p class="gig__place">' + place + '</p>' : '') +
      (g.note ? '<span class="tag tag--accent gig__note">' + esc(g.note) + '</span>' : '') + '</div>' +
      '<div class="gig__action">' + action + '</div></li>';
  }

  function gigsSchema(c, gigs) {
    var site = get(c, 'site.url') || location.origin;
    var events = gigs.map(function (g) {
      var ev = {
        '@context': 'https://schema.org', '@type': 'ComedyEvent',
        name: 'Archie Monge live at ' + g.venue,
        startDate: isoDate(g._d),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: g.venue, address: { '@type': 'PostalAddress', addressLocality: g.city || '', addressCountry: g.country || '' } },
        performer: { '@type': 'Person', name: get(c, 'site.name') || 'Archie Monge', url: site }
      };
      if (g.ticket_url) ev.offers = { '@type': 'Offer', url: g.ticket_url, availability: g.sold_out ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' };
      return ev;
    });
    var old = document.getElementById('gigs-schema');
    if (old) old.remove();
    if (!events.length) return;
    var s = document.createElement('script');
    s.id = 'gigs-schema';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(events);
    document.head.appendChild(s);
  }

  function renderGigs(c) {
    var locale = get(c, 'site.locale') || undefined;
    var all = upcomingGigs(c);
    $$('[data-slot="gigs"]').forEach(function (el) {
      var limit = parseInt(el.dataset.limit, 10) || 0;
      var gigs = limit ? all.slice(0, limit) : all;
      if (!gigs.length) {
        var e = c.gigs_empty || {};
        el.innerHTML = emptyState(e.title || 'No public dates right now.', e.text || '', !!limit ? 'compact' : true);
        return;
      }
      el.innerHTML = '<ul class="gigs">' + gigs.map(function (g) { return gigItem(g, locale); }).join('') + '</ul>';
      if (el.hasAttribute('data-schema')) gigsSchema(c, all);
    });
  }

  function emptyState(title, text, mode) {
    var compact = mode === 'compact';
    return '<div class="empty' + (compact ? ' empty--compact' : '') + ' reveal"><div>' +
      '<p class="empty__title">' + esc(title) + '</p>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>' +
      '<a class="btn btn--primary" href="/book.html">Book me</a></div>';
  }

  // ---------- testimonials ----------
  function quoteCard(t) {
    var type = String(t.type || 'audience').toLowerCase();
    var label = TESTIMONIAL_LABELS[type] || type;
    return '<figure class="quote quote--' + esc(type) + ' reveal" data-type="' + esc(type) + '">' +
      '<span class="tag' + (type === 'audience' ? '' : ' tag--accent') + '">' + esc(label) + '</span>' +
      '<blockquote class="quote__text"><p>' + esc(t.quote) + '</p></blockquote>' +
      '<figcaption class="quote__by"><span class="quote__name">' + esc(t.name) + '</span>' +
      (t.role ? '<span class="quote__role">' + esc(t.role) + '</span>' : '') + '</figcaption></figure>';
  }

  function renderTestimonials(c) {
    var all = list(c.testimonials).filter(function (t) { return t.quote; });
    $$('[data-slot="testimonials"]').forEach(function (el) {
      var items = all;
      if (el.hasAttribute('data-featured')) {
        var featured = all.filter(function (t) { return t.featured; });
        if (featured.length) items = featured;
      }
      var limit = parseInt(el.dataset.limit, 10) || 0;
      if (limit) items = items.slice(0, limit);

      if (!items.length) {
        el.innerHTML = el.hasAttribute('data-empty')
          ? emptyState('Quotes incoming.', 'Testimonials from promoters and audiences will appear here soon. Book a night and you could write the first one.', true)
          : '';
        return;
      }

      var grid = '<div class="quotes" data-count="' + Math.min(items.length, 3) + '">' + items.map(quoteCard).join('') + '</div>';
      var types = [];
      items.forEach(function (t) { var k = String(t.type || 'audience').toLowerCase(); if (types.indexOf(k) < 0) types.push(k); });

      if (el.hasAttribute('data-filters') && items.length >= 4 && types.length > 1) {
        var order = Object.keys(TESTIMONIAL_LABELS);
        types.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
        var chips = [['all', 'All', items.length]].concat(types.map(function (k) {
          return [k, TESTIMONIAL_LABELS[k] || k, items.filter(function (t) { return String(t.type || 'audience').toLowerCase() === k; }).length];
        }));
        el.innerHTML = '<div class="filters" role="group" aria-label="Filter testimonials">' + chips.map(function (ch, i) {
          return '<button type="button" class="chip" data-filter="' + esc(ch[0]) + '" aria-pressed="' + (i === 0) + '">' + esc(ch[1]) +
            '<span class="chip__count">' + ch[2] + '</span></button>';
        }).join('') + '</div>' + grid;
        el.addEventListener('click', function (e) {
          var chip = e.target.closest('.chip');
          if (!chip) return;
          var f = chip.dataset.filter;
          $$('.chip', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b === chip)); });
          var shown = 0;
          $$('.quote', el).forEach(function (q) {
            var show = f === 'all' || q.dataset.type === f;
            q.hidden = !show;
            if (show) { shown++; q.classList.add('is-in'); }
          });
          $('.quotes', el).dataset.count = Math.min(shown, 3);
        });
      } else {
        el.innerHTML = grid;
      }
    });
  }

  // ---------- about / press kit ----------
  function renderFacts(c) {
    var facts = list(c.quick_facts);
    $$('[data-slot="facts"]').forEach(function (el) {
      if (!facts.length) { el.hidden = true; if (el.previousElementSibling && el.previousElementSibling.classList.contains('facts-title')) el.previousElementSibling.hidden = true; return; }
      el.innerHTML = facts.map(function (f) {
        return '<div class="fact"><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>';
      }).join('');
    });
  }

  function renderPressKit(c) {
    var kit = c.press_kit || {};
    $$('[data-slot="press-photos"]').forEach(function (el) {
      var photos = list(kit.photos);
      if (!photos.length) { el.innerHTML = '<p class="muted">Press photos available on request — just email.</p>'; return; }
      el.innerHTML = photos.map(function (p, i) {
        var file = asset(p.file);
        var name = file.split('/').pop();
        return '<figure class="press-photo reveal">' +
          '<a class="press-photo__img" href="' + esc(file) + '" target="_blank" rel="noopener" aria-label="Open full-size photo ' + (i + 1) + '">' +
          '<img src="' + esc(asset(p.preview) || file) + '" alt="' + esc(p.caption || 'Press photo of Archie Monge') + '" loading="lazy" decoding="async"></a>' +
          '<figcaption><span>' + esc(p.caption || '') + '</span>' +
          '<a class="press-photo__dl" href="' + esc(file) + '" download="' + esc(name) + '">Download hi-res</a>' +
          (p.credit ? '<span class="press-photo__credit">' + esc(p.credit) + '</span>' : '') + '</figcaption></figure>';
      }).join('');
    });
    $$('[data-slot="press-zip"]').forEach(function (el) {
      if (kit.zip) { el.href = asset(kit.zip); el.hidden = false; }
    });
  }

  function setupCopyButtons(c) {
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = plainText(get(c, btn.dataset.copy));
        var done = function () {
          var old = btn.textContent;
          btn.textContent = 'Copied ✓';
          setTimeout(function () { btn.textContent = old; }, 2000);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
      });
    });
  }

  // ---------- booking form ----------
  function setupForm(c) {
    var form = $('form[name="booking"]');
    if (!form) return;
    var booking = c.booking || {};
    var email = get(c, 'contact.email') || '';

    // Earliest selectable date = today
    var dateInput = $('#f-date', form);
    if (dateInput) dateInput.min = isoDate(new Date());

    // Pre-select event type from a link like /book.html?type=corporate
    var type = new URLSearchParams(location.search).get('type');
    var select = $('#f-type', form);
    if (type && select && $('option[value="' + CSS.escape(type) + '"]', select)) select.value = type;

    function fieldError(field, msg) {
      var wrap = field.closest('.field');
      var err = $('.field__error', wrap);
      if (msg) {
        wrap.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
        if (!err) { err = document.createElement('span'); err.className = 'field__error'; err.id = field.id + '-err'; wrap.appendChild(err); }
        err.textContent = msg;
        field.setAttribute('aria-describedby', err.id);
      } else {
        wrap.classList.remove('is-invalid');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        if (err) err.remove();
      }
    }
    function validate(field) {
      if (field.validity.valid) { fieldError(field, ''); return true; }
      var msg = field.validity.valueMissing ? 'This one’s needed.' :
        field.validity.typeMismatch ? 'That email doesn’t look quite right.' : field.validationMessage;
      fieldError(field, msg);
      return false;
    }
    $$('input[required], select[required], textarea[required]', form).forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value) validate(f); });
      f.addEventListener('input', function () { if (f.closest('.field').classList.contains('is-invalid')) validate(f); });
    });

    var status = $('.form__status', form);
    var submit = $('button[type="submit"]', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.innerHTML = '';
      var invalid = $$('input[required], select[required], textarea[required], input[type="email"]', form).filter(function (f) { return !validate(f); });
      if (invalid.length) { invalid[0].focus(); return; }

      // Honeypot: real people never see or fill this field.
      if (form.elements['bot-field'] && form.elements['bot-field'].value) return;

      var data = new FormData(form);
      var request;
      if (booking.formspree_id) {
        data.delete('form-name'); data.delete('bot-field');
        data.append('_subject', 'New booking enquiry: ' + (data.get('event_type') || '') + ' — ' + (data.get('name') || ''));
        data.append('_replyto', data.get('email'));
        request = fetch('https://formspree.io/f/' + encodeURIComponent(booking.formspree_id), {
          method: 'POST', body: data, headers: { Accept: 'application/json' }
        });
      } else {
        request = fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString()
        });
      }

      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = 'Sending…';

      request.then(function (res) {
        if (!res.ok) throw new Error('Form service replied ' + res.status);
        var first = String(data.get('name') || '').trim().split(/\s+/)[0] || 'there';
        var thanks = $('.thanks');
        $('.thanks__title', thanks).textContent = booking.thank_you_title || 'Enquiry received.';
        $('.thanks__text', thanks).textContent = (booking.thank_you_message || 'Thanks, {name}. I’ll be in touch soon.').replace(/\{name\}/g, first);
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
        thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function (err) {
        console.error(err);
        status.innerHTML = esc(booking.error_message || 'That didn’t send. Please email me directly:') +
          ' <a href="mailto:' + esc(email) + '">' + esc(email) + '</a>';
        submit.disabled = false;
        submit.textContent = label;
      });
    });
  }

  // ---------- chrome: nav, header, year, reveal ----------
  function setupNav() {
    var toggle = $('.nav-toggle');
    if (!toggle) return;
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setOpen(false); toggle.focus(); } });
    $$('#site-nav a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    window.matchMedia('(min-width: 821px)').addEventListener('change', function (mq) { if (mq.matches) setOpen(false); });

    var header = $('.site-header');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var observer;
  function setupReveal() {
    var items = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    observer = observer || new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); observer.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { observer.observe(el); });
  }

  function init() {
    setupNav();
    setupClipPlayers();
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    var calendar = $('[data-slot="gigs"]') ? loadCalendarGigs() : Promise.resolve([]);

    loadContent().then(function (c) {
      var steps = [applyBindings, renderSocials, renderHero, renderCredits, renderClips,
        renderTestimonials, renderFacts, renderPressKit, setupCopyButtons, setupForm];
      steps.forEach(function (fn) {
        try { fn(c); } catch (err) { showContentError(err); }
      });
      setupReveal();
      // Gigs wait for the calendar so the "no dates" message never flashes up first.
      return calendar.then(function (fromCalendar) {
        c.gigs = mergeGigs(list(c.gigs), fromCalendar);
        try { renderGigs(c); } catch (err) { showContentError(err); }
      });
    }).catch(showContentError).then(setupReveal);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

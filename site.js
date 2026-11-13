/* Groceipt website: the sample receipts, and the motion that follows the scroll.
   Everything here is extra: without it the page still reads top to bottom, with the weekly shop showing.
   Motion runs only when the device allows it (the script in index.html's head adds "motion" to the page);
   then this file adds "live", and the CSS moves things only under .live or .motion. DESIGN.md section 6 has the rules. */
(function () {
  'use strict';

  // ---------- The three sample receipts ----------
  // Real foods and prices that add up. "i" is each food's line on the receipt, so the foods land in receipt order.
  // How long each keeps follows the Kitchen's guesses; "Use soon" means about 2 days or fewer (src/kitchen/config.ts).
  var RECEIPTS = {
    weekly: {
      name: 'Weekly shop',
      store: 'Corner Grocer',
      when: '10/24/26 6:42 PM',
      lines: [
        ['Baby spinach', '3.49'],
        ['Strawberries', '4.99'],
        ['Chicken thighs', '7.98'],
        ['Greek yogurt', '5.29'],
        ['Paper towels', '6.49'],
      ],
      total: '28.24',
      kitchen: [
        ['Produce', [['Baby spinach', 'About 2 days left', 'soon', 0], ['Strawberries', 'About 4 days left', 'fresh', 1]]],
        ['Meat & seafood', [['Chicken thighs', 'Use today', 'soon', 2]]],
        ['Dairy & eggs', [['Greek yogurt', 'About 2 weeks left', 'fresh', 3]]],
      ],
      recipe: { title: 'Spinach & chicken skillet', meta: '25 min · about $2.10 a serving', uses: 'Helps use up your baby spinach and chicken thighs' },
      list: ['Paper towels'],
      price: null,
    },
    tacos: {
      name: 'Taco night',
      store: 'Corner Grocer',
      when: '10/27/26 5:15 PM',
      lines: [
        ['Ground turkey', '6.49'],
        ['Corn tortillas', '2.99'],
        ['Avocados', '2.50'],
        ['Cilantro', '0.99'],
        ['Salsa', '3.79'],
      ],
      total: '16.76',
      kitchen: [
        ['Produce', [['Avocados', 'About 3 days left', 'fresh', 2], ['Cilantro', 'About 5 days left', 'fresh', 3]]],
        ['Bread & grains', [['Corn tortillas', 'About 2 weeks left', 'fresh', 1]]],
        ['Meat & seafood', [['Ground turkey', 'About 2 days left', 'soon', 0]]],
        ['Sauces & spices', [['Salsa', 'About 2 months left', 'fresh', 4]]],
      ],
      recipe: { title: 'Turkey tacos', meta: '20 min · about $2.20 a serving', uses: 'Helps use up your ground turkey' },
      list: ['Corn tortillas', 'Salsa'],
      price: null,
    },
    breakfast: {
      name: 'Breakfast run',
      store: 'Fresh Market',
      when: '10/04/26 9:12 AM',
      lines: [
        ['Bananas', '1.42'],
        ['Blueberries', '3.99'],
        ['Whole milk', '3.89'],
        ['Eggs', '3.29'],
        ['Sourdough bread', '4.49'],
      ],
      total: '17.08',
      kitchen: [
        ['Produce', [['Bananas', 'About 4 days left', 'fresh', 0], ['Blueberries', 'About 5 days left', 'fresh', 1]]],
        ['Bread & grains', [['Sourdough bread', 'About 5 days left', 'fresh', 4]]],
        ['Dairy & eggs', [['Whole milk', 'About 1 week left', 'fresh', 2], ['Eggs', 'About 3 weeks left', 'fresh', 3]]],
      ],
      recipe: { title: 'Blueberry banana pancakes', meta: '20 min · about $1.10 a serving', uses: null },
      list: [],
      price: { name: 'Whole milk', change: '$3.49 → $3.89', since: 'Fresh Market, since Oct 4' },
    },
  };

  var TICK =
    '<span class="tick"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>';

  function amp(text) {
    return text.replace(/&/g, '&amp;');
  }

  function joinNames(names) {
    return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  // What a screen reader hears for each panel: one plain sentence instead of every fragment.
  function describe(r) {
    var foods = [];
    var soon = [];
    r.kitchen.forEach(function (section) {
      section[1].forEach(function (food) {
        foods.push(food[0] + ', ' + food[1].toLowerCase());
        if (food[2] === 'soon') soon.push(food[0]);
      });
    });
    var next = r.recipe.title + ', ' + r.recipe.meta.replace(' · ', ', ').toLowerCase() + '.';
    if (r.list.length) next += ' ' + joinNames(r.list) + ' came off your List.';
    if (r.price) next += ' ' + r.price.name + ' went from ' + r.price.change.replace(' → ', ' to ') + ' at ' + r.store + '.';
    return {
      check:
        'The receipt as Groceipt reads it: ' + r.store + ', ' + r.when + '. ' +
        r.lines.map(function (l) { return l[0] + ' ' + l[1]; }).join(', ') + '. Total ' + r.total + '.',
      kitchen:
        'The Kitchen it fills in, by store section: ' + foods.join('; ') + '.' +
        (soon.length ? ' Use soon: ' + joinNames(soon) + '.' : ''),
      next: 'What it suggests next: ' + next,
    };
  }

  // The three panels for one receipt, drawn the way the app shows them.
  function renderFlow(key) {
    var r = RECEIPTS[key];
    var said = describe(r);
    var soonCount = 0;
    var kitchen = r.kitchen
      .map(function (section) {
        return (
          '<p class="k-sec">' + amp(section[0]) + '</p>' +
          section[1]
            .map(function (food) {
              if (food[2] === 'soon') soonCount += 1;
              return (
                '<div class="k-row" style="--i: ' + food[3] + '"><span class="k-name">' + food[0] + '</span><span class="k-left">' + food[1] +
                '</span><span class="chip ' + food[2] + '">' + (food[2] === 'soon' ? 'Use soon' : 'Fresh') + '</span></div>'
              );
            })
            .join('')
        );
      })
      .join('');
    var banner = soonCount ? '<p class="k-banner">' + (soonCount === 1 ? '1 thing should' : soonCount + ' things should') + ' be used soon.</p>' : '';
    var next =
      '<p class="k-sec">Cook</p>' +
      '<p class="n-title">' + amp(r.recipe.title) + '</p>' +
      '<p class="n-meta">' + r.recipe.meta + '</p>' +
      (r.recipe.uses ? '<p class="soon-note">' + r.recipe.uses + '</p>' : '');
    if (r.list.length) {
      next +=
        '<p class="k-sec n-sec">List</p>' +
        r.list
          .map(function (item) {
            return '<p class="n-row">' + TICK + '<span class="done">' + item + '</span><span class="k-off">Off your List</span></p>';
          })
          .join('');
    }
    if (r.price) {
      next +=
        '<p class="k-sec n-sec">Price changes</p>' +
        '<p class="n-price"><strong>' + r.price.name + '</strong><span class="amount">' + r.price.change + '</span></p>' +
        '<p class="muted-stone">' + r.price.since + '</p>';
    }
    return (
      '<div class="try-step">' +
      '<p class="try-cap"><span class="try-num">1</span>You snap it</p>' +
      '<div class="panel check" role="img" aria-label="' + said.check + '">' +
      '<p class="p-title">Check your receipt</p>' +
      '<p class="p-sub">' + r.store + ' · ' + r.when + '</p>' +
      '<ul class="lines">' +
      r.lines
        .map(function (l, i) {
          return '<li style="--i: ' + i + '"><span>' + l[0] + '</span><span class="amount">' + l[1] + '</span></li>';
        })
        .join('') +
      '</ul>' +
      '<p class="p-total"><span>Total</span><span class="amount">' + r.total + '</span></p>' +
      '<span class="btn p-btn">Add to kitchen</span>' +
      '<span class="scanline"></span>' +
      '</div>' +
      '</div>' +
      '<div class="try-link" aria-hidden="true"></div>' +
      '<div class="try-step">' +
      '<p class="try-cap"><span class="try-num">2</span>Your Kitchen, about 30 seconds later</p>' +
      '<div class="panel kitchen" role="img" aria-label="' + said.kitchen + '">' + banner + kitchen + '</div>' +
      '</div>' +
      '<div class="try-link" aria-hidden="true"></div>' +
      '<div class="try-step">' +
      '<p class="try-cap"><span class="try-num">3</span>What it suggests</p>' +
      '<div class="panel next" role="img" aria-label="' + amp(said.next) + '">' + next + '</div>' +
      '</div>'
    );
  }

  // Run by Node (scripts or tests): hand over the data instead of touching a page.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { RECEIPTS: RECEIPTS, renderFlow: renderFlow };
    return;
  }

  var root = document.documentElement;
  var motion = root.classList.contains('motion');
  root.classList.add('js');
  if (motion) root.classList.add('live');

  // ---------- Try it: the picker in the hero, and the panels under it ----------
  var form = document.getElementById('try-form');
  var flow = document.getElementById('try-flow');
  var status = document.getElementById('try-status');
  var section = document.getElementById('try');
  var switches = [].slice.call(document.querySelectorAll('.switch'));
  var player = null;

  // Plays the panels once they're on screen. Without motion they simply show.
  function arm() {
    if (!motion || !flow) return;
    flow.classList.remove('play');
    if (!player) {
      player = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting) return;
          void flow.offsetWidth; // restart the animation from the top
          flow.classList.add('play');
          player.unobserve(flow);
        },
        { threshold: 0.3 }
      );
    }
    player.unobserve(flow);
    player.observe(flow);
  }

  function show(key) {
    if (!RECEIPTS[key] || !flow) return;
    flow.innerHTML = renderFlow(key);
    switches.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-receipt') === key));
    });
    if (form) {
      [].forEach.call(form.querySelectorAll('input[name="receipt"]'), function (input) {
        input.checked = input.value === key;
      });
    }
    if (status) status.textContent = 'Showing the ' + RECEIPTS[key].name.toLowerCase() + ' receipt.';
    arm();
  }

  if (form && flow) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var picked = form.querySelector('input[name="receipt"]:checked');
      show(picked ? picked.value : 'weekly');
      section.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
    });
    switches.forEach(function (button) {
      button.addEventListener('click', function () {
        show(button.getAttribute('data-receipt'));
      });
    });
    arm();
  }

  if (!motion) return;

  // ---------- Things that come in as you reach them ----------
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (reveals.length) {
    var seen = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            seen.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach(function (el) {
      seen.observe(el);
    });
  }

  // ---------- Motion tied to the scroll ----------
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');
  var layers = [].slice.call(document.querySelectorAll('[data-speed]'));
  var heroWords = document.querySelector('.hero-words');
  var drifts = [].slice.call(document.querySelectorAll('.drift'));
  var track = document.querySelector('.story-track');
  var steps = track ? [].slice.call(track.querySelectorAll('.s-step')) : [];
  var shots = steps.map(function (step) {
    return step.querySelector('.s-shot');
  });
  var bars = track ? [].slice.call(track.querySelectorAll('.s-progress span')) : [];
  var storyHead = track ? track.querySelector('.story-head') : null;
  var ticking = false;
  var active = -1;

  // ---------- The clips in the receipt's week ----------
  // Only on computers (a big screen with a mouse or trackpad), and not on a slow or data-saving connection.
  // Phones and tablets keep the stills: the clips are big, and their browsers jump between frames slowly.
  // The clips load one after another when the section comes near, each one whole before it shows, so the
  // scroll can jump to any moment in it at once. Until then, or if one fails, its still shows.
  var connection = navigator.connection;
  var clips = [];
  var scrubbing = false;
  if (
    track &&
    window.matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)').matches &&
    !(connection && (connection.saveData || /2g|3g/.test(connection.effectiveType || '')))
  ) {
    clips = [].slice.call(track.querySelectorAll('video[data-clip]')).map(function (video) {
      return { el: video, step: steps.indexOf(video.closest('.s-step')), goal: 0, now: -1, on: false, ready: false };
    });
  }

  function loadClips() {
    var width = window.innerWidth * (window.devicePixelRatio || 1) >= 1800 ? 1920 : 1280;
    root.classList.add('clips');
    clips.reduce(function (previous, clip) {
      var video = clip.el;
      return previous
        .then(function () {
          return fetch('assets/clips/web/' + video.getAttribute('data-clip') + '-' + width + '.mp4');
        })
        .then(function (response) {
          if (!response.ok) throw new Error('clip ' + response.status);
          return response.blob();
        })
        .then(function (blob) {
          video.addEventListener(
            'loadeddata',
            function () {
              clip.ready = true;
              video.classList.add('ready');
              request();
            },
            { once: true }
          );
          video.addEventListener('seeked', scrubSoon);
          video.src = URL.createObjectURL(blob);
          video.load();
        })
        .catch(function () {
          // The still stays, and the next clip still loads.
        });
    }, Promise.resolve());
  }

  if (clips.length) {
    var near = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        near.disconnect();
        loadClips();
      },
      { rootMargin: '150% 0px' }
    );
    near.observe(track);
  }

  // Each clip follows the scroll: it eases toward the moment the scroll asks for, a little each frame,
  // so a mouse wheel's jumps still look like smooth camera moves. It never plays on its own.
  function scrub() {
    scrubbing = false;
    var more = false;
    clips.forEach(function (clip) {
      var video = clip.el;
      if (!clip.ready || !clip.on) return;
      var goal = clip.goal * Math.max(0, (video.duration || 5) - 0.05);
      clip.now = clip.now < 0 ? goal : clip.now + (goal - clip.now) * 0.25;
      if (Math.abs(goal - clip.now) < 0.01) clip.now = goal;
      else more = true;
      if (video.seeking) more = true;
      else if (Math.abs(video.currentTime - clip.now) > 0.01) video.currentTime = clip.now;
    });
    if (more) scrubSoon();
  }

  function scrubSoon() {
    if (!scrubbing) {
      scrubbing = true;
      window.requestAnimationFrame(scrub);
    }
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    // The header is see-through over the top of the hero, and solid paper once you scroll.
    if (header) header.classList.toggle('over', y < 24);

    // The hero's layers: the photo drifts slower than the page, the title a little slower still,
    // and the title fades as the picker reaches it.
    if (hero && y < hero.offsetHeight) {
      layers.forEach(function (el) {
        el.style.transform = 'translate3d(0, ' + (y * parseFloat(el.getAttribute('data-speed'))).toFixed(1) + 'px, 0)';
      });
      if (heroWords) heroWords.style.opacity = clamp(1 - y / (vh * 0.55), 0, 1).toFixed(3);
    }

    // Photos in frames move a little inside them, so they feel deeper than the page.
    drifts.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var centre = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty('--drift', (centre * -24).toFixed(1) + 'px');
    });

    // The receipt's week: the section stays on screen while the photos change, one step at a time.
    if (track && steps.length) {
      var box = track.getBoundingClientRect();
      var length = box.height - vh;
      if (box.bottom > 0 && box.top < vh && length > 0) {
        var at = clamp(-box.top / length, 0, 1) * steps.length; // 0 to 5
        // The section's title opens the first step, then steps aside for the photos.
        if (storyHead) storyHead.style.opacity = clamp(1 - (at - 0.6) / 0.35, 0, 1).toFixed(3);
        shots.forEach(function (shot, i) {
          if (!shot) return;
          // Each scene fades in over the one before it, then slowly pushes in while it's on.
          var opacity = i === 0 ? 1 : clamp((at - i + 0.2) / 0.3, 0, 1);
          shot.style.opacity = opacity.toFixed(3);
          shot.style.setProperty('--zoom', (1.03 + 0.07 * clamp((at - i + 0.2) / 1.2, 0, 1)).toFixed(4));
        });
        // A clip runs from when its scene starts to fade in until the next one has covered it.
        clips.forEach(function (clip) {
          var i = clip.step;
          var start = i === 0 ? 0 : i - 0.2;
          clip.goal = clamp((at - start) / (i + 1 - start), 0, 1);
          clip.on = at > start - 0.05 && at < i + 1.15;
        });
        if (clips.length) scrubSoon();
        var now = clamp(Math.floor(at + 0.1), 0, steps.length - 1);
        if (now !== active) {
          active = now;
          steps.forEach(function (step, i) {
            step.classList.toggle('on', i === now);
          });
          bars.forEach(function (bar, i) {
            bar.classList.toggle('on', i <= now);
          });
        }
      }
    }
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  frame();
  // Fades start only after the first frame, so a page opened halfway down doesn't fade everything at once.
  window.requestAnimationFrame(function () {
    root.classList.add('ready');
  });
})();

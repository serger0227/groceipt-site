/* Groceipt website: the motion that follows the scroll.
   Everything here is extra: without it the page still reads top to bottom.
   Motion runs only when the device allows it (the script in index.html's head adds "motion" to the page);
   then this file adds "live", and the CSS moves things only under .live or .motion. DESIGN.md section 6 has the rules. */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  root.classList.add('live');

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
    // and the title fades as the groceries rise over it.
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

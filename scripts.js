/* ============================================
   1. Year updaters
============================================ */
(function() {
    var y = new Date().getFullYear();
    var el = document.getElementById('copy-year');
    if (el) el.textContent = y;
})();

/* ============================================
   2. Loader logic
============================================ */
(function() {
    function onReady(fn) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(fn, 10);
        } else {
            window.addEventListener('load', fn);
        }
    }

    onReady(function() {
        var loader = document.getElementById('loader-overlay');
        var content = document.querySelector('.content');
        if (!loader || !content) return;

        var prefersReducedMotion = false;
        try {
            if (window.matchMedia) {
                prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            }
        } catch (e) {
            prefersReducedMotion = false;
        }

        function showPage() {
            loader.classList.add('loader-hidden');
            content.classList.add('content-visible');
        }

        if (prefersReducedMotion) {
            showPage();
        } else {
            setTimeout(showPage, 1800);
        }
    });
})();

/* ============================================
   3. Navbar behaviour (scroll + collapse)
============================================ */
(function() {
    var navbar = document.querySelector('.hic-navbar');
    var navLinks = document.querySelectorAll('.hic-navbar .nav-link');
    var navbarToggler = document.querySelector('.navbar-toggler');

    if (!navbar) return;

    function updateNavbarOnScroll() {
        var offset = window.scrollY || window.pageYOffset || 0;
        if (offset > 10) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }

    window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    updateNavbarOnScroll();

    if (navbarToggler && navLinks.length) {
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                if (window.innerWidth < 992) {
                    if (!navbarToggler.classList.contains('collapsed')) {
                        navbarToggler.click();
                    }
                }
            });
        });
    }
})();

/* ============================================
   4. Particles.js init
============================================ */
particlesJS('particles-page', {
    "particles": {
        "number": {
            "value": 55,
            "density": {
                "enable": true,
                "value_area": 900
            }
        },
        "color": { "value": ["#C9B694"] },
        "shape": { "type": "circle" },
        "opacity": {
            "value": 0.70,
            "random": true,
            "anim": {
                "enable": true,
                "speed": 0.6,
                "opacity_min": 0.3,
                "sync": false
            }
        },
        "size": {
            "value": 2.5,
            "random": true,
            "anim": {
                "enable": true,
                "speed": 1.5,
                "size_min": 1,
                "sync": false
            }
        },
        "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#C9B694",
            "opacity": 0.55,
            "width": 1
        },
        "move": {
            "enable": true,
            "speed": 2.2,
            "direction": "none",
            "random": true,
            "straight": false,
            "out_mode": "out",
            "attract": {
                "enable": true,
                "rotateX": 600,
                "rotateY": 1200
            }
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": { "enable": false },
            "onclick": { "enable": false },
            "resize": true
        }
    },
    "retina_detect": true
});

/* ============================================
   5. Parallax for particles background
============================================ */
(function() {
    var bg = document.getElementById('particles-page');
    if (!bg) return;

    window.addEventListener('scroll', function() {
        var offset = window.pageYOffset || document.documentElement.scrollTop || 0;
        bg.style.transform = 'translateY(' + (offset * 0.02) + 'px)';
    }, { passive: true });
})();

/* ============================================
   6. Internal page fade transitions
============================================ */
(function() {
    var content = document.querySelector('.content');
    if (!content) return;

    function isInternalLink(link) {
        if (!link.href) return false;
        if (link.target && link.target === '_blank') return false;
        var url = new URL(link.href, window.location.href);
        return url.origin === window.location.origin;
    }

    document.addEventListener('click', function(e) {
        var link = e.target.closest('a');
        if (!link) return;
        if (!isInternalLink(link)) return;
        if (link.getAttribute('href').startsWith('#')) return;
        if (link.hasAttribute('data-no-fade')) return;

        e.preventDefault();
        document.body.classList.add('page-fade-out');

        setTimeout(function() {
            window.location.href = link.href;
        }, 220);
    }, { capture: true });
})();

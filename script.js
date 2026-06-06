const profile = {
    siteName: 'CHICHI',
    github: 'https://github.com/dh666i',
    githubLabel: '@dh666i'
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyProfile() {
    document.querySelectorAll('[data-site-name]').forEach((node) => {
        node.textContent = profile.siteName;
    });
    const githubLink = document.querySelector('[data-github-link]');
    const githubText = document.querySelector('[data-github-text]');

    if (githubLink) githubLink.href = profile.github;
    if (githubText) githubText.textContent = profile.githubLabel;

    document.querySelectorAll('[data-year]').forEach((node) => {
        node.textContent = new Date().getFullYear();
    });
}

function initMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('#site-menu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
    });
}

function initScrollMeter() {
    const meter = document.querySelector('[data-scroll-meter]');
    if (!meter) return;

    const update = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll <= 0 ? 0 : (window.scrollY / maxScroll) * 100;
        meter.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
        items.forEach((item) => item.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -80px 0px'
    });

    items.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
        observer.observe(item);
    });
}

function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const animate = (node) => {
        const target = Number(node.dataset.count || 0);
        if (prefersReducedMotion || target === 0) {
            node.textContent = String(target);
            return;
        }

        const duration = target > 100 ? 1100 : 600;
        const start = performance.now();
        const from = target > 100 ? target - 28 : 0;

        const frame = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            node.textContent = String(Math.round(from + (target - from) * eased));
            if (progress < 1) requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
    };

    if (!('IntersectionObserver' in window)) {
        counters.forEach(animate);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animate(entry.target);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.5 });

    counters.forEach((counter) => observer.observe(counter));
}

function initSpotlightCards() {
    const cards = document.querySelectorAll('[data-spotlight]');

    cards.forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
            card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
        });
    });
}

function initTilt() {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('[data-tilt]').forEach((node) => {
        node.addEventListener('pointermove', (event) => {
            const rect = node.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            node.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 6}deg) translateY(-2px)`;
        });

        node.addEventListener('pointerleave', () => {
            node.style.transform = '';
        });
    });
}

function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-links a'));
    const sections = links
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    if (!sections.length) return;

    const update = () => {
        const current = sections.reduce((active, section) => {
            const top = section.getBoundingClientRect().top;
            return top <= 160 ? section : active;
        }, sections[0]);

        links.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current.id}`);
        });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initCursorSpotlight() {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    const spotlight = document.querySelector('.cursor-spotlight');
    if (!spotlight) return;

    window.addEventListener('pointermove', (event) => {
        spotlight.style.opacity = '1';
        spotlight.style.left = `${event.clientX}px`;
        spotlight.style.top = `${event.clientY}px`;
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
        spotlight.style.opacity = '0';
    });
}

function initConsoleSignature() {
    console.log('%cCHICHI', 'font-size: 22px; font-weight: 800; color: #c46139;');
    console.log('Static personal site, ready for GitHub Pages.');
}

document.addEventListener('DOMContentLoaded', () => {
    applyProfile();
    initMenu();
    initScrollMeter();
    initReveal();
    initCounters();
    initSpotlightCards();
    initTilt();
    initActiveNav();
    initCursorSpotlight();
    initConsoleSignature();
});


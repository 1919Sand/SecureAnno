/* ============================================================
   SECUREANNO - LANDING PAGE JAVASCRIPT
   Handles navigation, animations, stats counter, and form
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const contactForm = document.getElementById('contactForm');
    const sections = document.querySelectorAll('section[id]');
    const serviceCards = document.querySelectorAll('.service-card');

    // === NAVBAR SCROLL EFFECT ===
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // === MOBILE NAV TOGGLE ===
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // === SMOOTH SCROLL FOR ANCHOR LINKS ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // === ANIMATED STATS COUNTER ===
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    function animateStats() {
        if (statsAnimated) return;

        const statsSection = document.querySelector('.hero-stats');
        if (!statsSection) return;

        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            statsAnimated = true;

            statNumbers.forEach(el => {
                const rawTarget = el.dataset.target || '';
                const target = parseFloat(rawTarget);
                if (Number.isNaN(target)) return;

                const unit = rawTarget.replace(/[0-9.+]/g, '');
                const isDecimal = target % 1 !== 0;
                const duration = 2000;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = target * eased;

                    if (isDecimal) {
                        el.textContent = unit ? `${current.toFixed(1)}${unit}` : current.toFixed(1);
                    } else {
                        const whole = Math.floor(current);
                        el.textContent = unit ? `${whole}${unit}` : whole;
                    }

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }

                requestAnimationFrame(updateCounter);
            });
        }
    }

    window.addEventListener('scroll', animateStats);
    animateStats();

    // === SCROLL REVEAL ANIMATION ===
    function initScrollReveal() {
        const elements = document.querySelectorAll(
            '.coverage-card, .about-card, .service-card, .process-step, .knowledge-card, .blog-card, .contact-wrapper'
        );

        elements.forEach(el => {
            el.classList.add('fade-in');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const parent = entry.target.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(
                            child => child.classList.contains('fade-in')
                        );
                        const index = siblings.indexOf(entry.target);
                        entry.target.style.transitionDelay = `${index * 0.1}s`;
                    }

                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(el => observer.observe(el));
    }

    initScrollReveal();

    // === NER TAG HIGHLIGHT ANIMATION ===
    function initNERAnimation() {
        const nerTags = document.querySelectorAll('.ner-tag');

        nerTags.forEach((tag, index) => {
            tag.style.opacity = '0';
            tag.style.transform = 'translateY(5px)';

            setTimeout(() => {
                tag.style.transition = 'opacity 0.4s ease, transform 0.4s ease, background 0.3s ease';
                tag.style.opacity = '1';
                tag.style.transform = 'translateY(0)';
            }, 800 + index * 200);
        });

        nerTags.forEach(tag => {
            tag.addEventListener('mouseenter', () => {
                tag.style.transform = 'translateY(-2px) scale(1.05)';
            });
            tag.addEventListener('mouseleave', () => {
                tag.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    initNERAnimation();

    const serviceInterestSelect = document.getElementById('serviceInterest');
    const dataVolumeSelect = document.getElementById('dataVolume');
    const dataVolumeLabel = document.querySelector('label[for="dataVolume"]');
    const projectDetailsField = document.getElementById('projectDetails');

    const standardVolumeOptions = [
        { value: 'lt1000', label: 'Less than 1,000 records' },
        { value: '1000-10000', label: '1,000 - 10,000 records' },
        { value: '10000-100000', label: '10,000 - 100,000 records' },
        { value: '100000plus', label: '100,000+ records' },
        { value: 'other', label: 'Other / Not sure yet' }
    ];

    const opsWorkloadOptions = [
        { value: 'ops-lt500', label: 'Less than 500 tasks per month' },
        { value: 'ops-500-2000', label: '500 - 2,000 tasks per month' },
        { value: 'ops-2000-10000', label: '2,000 - 10,000 tasks per month' },
        { value: 'ops-10000plus', label: '10,000+ tasks per month' },
        { value: 'ops-team-1-3', label: 'Dedicated support team (1-3 members)' },
        { value: 'ops-team-4plus', label: 'Dedicated support team (4+ members)' },
        { value: 'ops-other', label: 'Other / Not sure yet' }
    ];

    function repopulateDataVolumeOptions() {
        if (!serviceInterestSelect || !dataVolumeSelect || !dataVolumeLabel) return;

        const previousValue = dataVolumeSelect.value;
        const isOpsFlow = serviceInterestSelect.value === 'ops';
        const placeholder = isOpsFlow ? 'Choose expected ops workload' : 'How much data?';
        const optionSet = isOpsFlow ? opsWorkloadOptions : standardVolumeOptions;

        dataVolumeSelect.innerHTML = '';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        dataVolumeSelect.appendChild(placeholderOption);

        optionSet.forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            dataVolumeSelect.appendChild(option);
        });

        const hasPreviousValue = optionSet.some(({ value }) => value === previousValue);
        dataVolumeSelect.value = hasPreviousValue ? previousValue : '';
        dataVolumeLabel.textContent = isOpsFlow ? 'Estimated Ops Workload' : 'Estimated Data Volume';

        if (projectDetailsField) {
            projectDetailsField.placeholder = isOpsFlow
                ? 'Share daily/weekly workload, expected turnaround time, SOP requirements, and whether you need a dedicated support team.'
                : 'Tell us about your project, data type, timeline, and any annotation requirements...';
        }
    }

    if (serviceInterestSelect && dataVolumeSelect) {
        repopulateDataVolumeOptions();
        serviceInterestSelect.addEventListener('change', repopulateDataVolumeOptions);
    }

    // === CONTACT FORM HANDLING ===
    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            const originalContent = submitBtn.innerHTML;

            submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spin">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10" stroke-linecap="round"/>
                </svg>
                Submitting...
            `;
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = typeof value === 'string' ? value.trim() : value;
            });

            try {
                await submitLead(data);

                contactForm.innerHTML = `
                    <div class="form-success">
                        <div class="form-success-icon">&#10003;</div>
                        <h3>Thank You!</h3>
                        <p>We've received your inquiry and will get back to you within 24 hours with a custom quote.</p>
                        <p style="margin-top: 12px; font-size: 0.85rem; color: var(--text-tertiary);">
                            We have recorded your request for <strong>${data.email || 'your inbox'}</strong>.
                        </p>
                    </div>
                `;
            } catch (error) {
                submitBtn.innerHTML = originalContent;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';

                showFormMessage(getFriendlySubmitError(error), 'error');
            }
        });

        const inputs = contactForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function () {
                if (this.required && !this.value.trim()) {
                    this.style.borderColor = '#C56B47';
                } else if (this.value.trim()) {
                    this.style.borderColor = 'var(--accent-green)';
                }
            });

            input.addEventListener('focus', function () {
                this.style.borderColor = 'var(--accent-primary)';
            });
        });
    }

    // === SERVICE CARD TILT EFFECT ===
    serviceCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // === ACTIVE NAV LINK TRACKING ===
    function highlightNavLink() {
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNavLink);
    highlightNavLink();

    // === DEMO TITLE CYCLING ===
    const demoTitle = document.querySelector('.demo-title');
    if (demoTitle) {
        const titles = [
            'FIR Annotation - Live Preview',
            'Legal Judgment Parsing - Active',
            'Property Address Labeling - Running',
            'Ops Task Extraction - Processing'
        ];
        let titleIndex = 0;

        setInterval(() => {
            titleIndex = (titleIndex + 1) % titles.length;
            demoTitle.style.opacity = '0';

            setTimeout(() => {
                demoTitle.textContent = titles[titleIndex];
                demoTitle.style.opacity = '1';
            }, 300);
        }, 4000);
    }
});

function showFormMessage(message, type) {
    const existing = document.querySelector('.form-message');
    if (existing) {
        existing.remove();
    }

    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    const el = document.createElement('div');
    el.className = `form-message ${type}`;
    el.textContent = message;
    contactForm.prepend(el);
}

function buildLeadApiCandidates() {
    const candidates = [];
    const { protocol, hostname, port } = window.location;
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const localProtocols = ['http:', 'https:'];

    if (isHttp) {
        if (hostname && port !== '3000') {
            candidates.push(`${protocol}//${hostname}:3000/api/contact`);
        }
    }

    // Always keep explicit localhost fallbacks so submit also works from file:// previews.
    for (const localProtocol of localProtocols) {
        candidates.push(`${localProtocol}//localhost:3000/api/contact`);
        candidates.push(`${localProtocol}//127.0.0.1:3000/api/contact`);
        candidates.push(`${localProtocol}//0.0.0.0:3000/api/contact`);
    }

    candidates.push('/api/contact');
    return Array.from(new Set(candidates));
}

async function submitLead(data) {
    const endpoints = buildLeadApiCandidates();
    let lastError = null;

    for (const endpoint of endpoints) {
        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } catch (error) {
            lastError = error;
            continue;
        }

        let result = null;
        try {
            result = await response.json();
        } catch {
            if (!response.ok) {
                lastError = new Error('Lead API response was not JSON.');
                continue;
            }
            throw new Error('We could not understand the server response.');
        }

        if (!response.ok || !result?.ok) {
            if (!response.ok && response.status === 404) {
                lastError = new Error('Lead API endpoint not found.');
                continue;
            }
            throw new Error(result?.message || 'Submission failed. Please try again.');
        }

        return result;
    }

    throw lastError || new Error('Could not reach the lead server.');
}

function getFriendlySubmitError(error) {
    const message = typeof error?.message === 'string' ? error.message.trim() : '';

    if (/failed to fetch/i.test(message) || /networkerror/i.test(message)) {
        return 'Could not reach the lead server. Start backend with node server.js and open http://localhost:3000.';
    }

    if (/could not understand the server response/i.test(message)) {
        return 'Lead API was not found on this server. Start the full backend server, then submit again.';
    }

    if (/endpoint not found/i.test(message) || /not json/i.test(message)) {
        return 'Lead API endpoint was not found on this host. Start node server.js and submit from localhost:3000.';
    }

    return message || 'Something went wrong. Please try again.';
}

const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
    }
    .nav-link.active {
        color: var(--text-primary) !important;
    }
    .nav-link.active::after {
        width: 100% !important;
    }
`;
document.head.appendChild(spinStyle);

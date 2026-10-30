/* ================================================================
   Miya Sahab Islamia Inter College (M.S.I. Inter College), Gorakhpur
   Official Website JavaScript - Complete & Fully Functional
   ================================================================ */

// ==========================================
// 1. LIVE DATE & TIME DISPLAY
// ==========================================
function updateDateTime() {
    const el = document.getElementById('datetime');
    if (!el) return;
    const now = new Date();
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const lang = (currentLang === 'hi') ? 'hi-IN' : 'en-IN';
    el.textContent = now.toLocaleString(lang, options);
}

// ==========================================
// 2. FONT RESIZE ENGINE (A+, A, A-)
// ==========================================
let currentFontSize = 16;

function changeFontSize(action) {
    if (action === 'increase' && currentFontSize < 22) {
        currentFontSize += 2;
    } else if (action === 'decrease' && currentFontSize > 12) {
        currentFontSize -= 2;
    } else if (action === 'reset') {
        currentFontSize = 16;
    }
    document.documentElement.style.fontSize = currentFontSize + 'px';
    try {
        localStorage.setItem('msi_font_size', currentFontSize);
    } catch (e) {}

    // Button visual feedback
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-font') === action) {
            btn.classList.add('active');
        }
    });
}

// ==========================================
// 3. COMPREHENSIVE LANGUAGE TRANSLATIONS
// ==========================================
let currentLang = 'hi';

const translations = {
    // Utility Bar
    'skip-link': {
        hi: 'मुख्य सामग्री पर जाएं | Skip to Content',
        en: 'Skip to Main Content'
    },
    'screen-reader': {
        hi: 'स्क्रीन रीडर एक्सेस',
        en: 'Screen Reader Access'
    },
    'est-label': {
        hi: '<i class="fas fa-calendar-alt"></i> स्थापना: 1908',
        en: '<i class="fas fa-calendar-alt"></i> Established: 1908'
    },

    // Header
    'gov-label': {
        hi: 'उत्तर प्रदेश सरकार | Government of Uttar Pradesh',
        en: 'Government of Uttar Pradesh | Secondary Education Department'
    },
    'college-name-hi': {
        hi: 'मियाँ साहब इस्लामिया इण्टर कॉलेज',
        en: 'Miya Sahab Islamia Inter College'
    },
    'college-name-en': {
        hi: 'M.S.I. Inter College',
        en: 'M.S.I. Inter College, Gorakhpur'
    },
    'college-address': {
        hi: '<i class="fas fa-map-marker-alt"></i> बक्सीपुर, गोरखपुर, उत्तर प्रदेश - 273001',
        en: '<i class="fas fa-map-marker-alt"></i> Buxipur, Gorakhpur, Uttar Pradesh - 273001'
    },
    'badge-gov': {
        hi: 'मान्यता प्राप्त: माध्यमिक शिक्षा परिषद, उत्तर प्रदेश (BHSIEUP)',
        en: 'Affiliated with UP Board (BHSIEUP), Prayagraj'
    },
    'badge-year': {
        hi: 'स्थापित: 1908',
        en: 'Est. 1908'
    },
    'badge-type': {
        hi: 'सह-शिक्षा | अंग्रेजी एवं हिन्दी माध्यम',
        en: 'Co-Educational | English & Hindi Medium'
    },

    // Navigation Menu
    'nav-toggle-text': {
        hi: '<i class="fas fa-bars"></i> मेनू | Navigation Menu',
        en: '<i class="fas fa-bars"></i> Menu'
    },
    'nav-home': {
        hi: '<i class="fas fa-home"></i> होम',
        en: '<i class="fas fa-home"></i> Home'
    },
    'nav-about': {
        hi: 'हमारे बारे में <i class="fas fa-caret-down"></i>',
        en: 'About Us <i class="fas fa-caret-down"></i>'
    },
    'nav-history': {
        hi: 'इतिहास',
        en: 'History'
    },
    'nav-principal': {
        hi: 'प्रधानाचार्य संदेश',
        en: "Principal's Message"
    },
    'nav-vision': {
        hi: 'दृष्टिकोण एवं लक्ष्य',
        en: 'Vision & Mission'
    },
    'nav-academics': {
        hi: 'शिक्षा <i class="fas fa-caret-down"></i>',
        en: 'Academics <i class="fas fa-caret-down"></i>'
    },
    'nav-courses': {
        hi: 'पाठ्यक्रम',
        en: 'Courses Offered'
    },
    'nav-faculty': {
        hi: 'शिक्षक-गण',
        en: 'Faculty'
    },
    'nav-syllabus': {
        hi: 'पाठ्यक्रम सूची',
        en: 'Syllabus'
    },
    'nav-facilities': {
        hi: 'सुविधाएं',
        en: 'Facilities'
    },
    'nav-admission': {
        hi: 'प्रवेश',
        en: 'Admission'
    },
    'nav-notice': {
        hi: 'सूचना पट्ट',
        en: 'Notice Board'
    },
    'nav-gallery': {
        hi: 'फोटो गैलरी',
        en: 'Photo Gallery'
    },
    'nav-contact': {
        hi: 'संपर्क करें',
        en: 'Contact Us'
    },

    // Marquee
    'marquee-label': {
        hi: '<i class="fas fa-bullhorn"></i> सूचना:',
        en: '<i class="fas fa-bullhorn"></i> Announcements:'
    },
    'marquee-content': {
        hi: '🔔 सत्र 2025-26 के लिए प्रवेश प्रक्रिया प्रारम्भ हो गई है | &nbsp;&nbsp;&nbsp; 📋 कक्षा 11 में प्रवेश हेतु विज्ञान, वाणिज्य एवं कला संकाय उपलब्ध | &nbsp;&nbsp;&nbsp; 📢 वार्षिकोत्सव का आयोजन शीघ्र होगा | &nbsp;&nbsp;&nbsp; ✅ UP Board से मान्यता प्राप्त (BHSIEUP, Prayagraj) | &nbsp;&nbsp;&nbsp; 🏫 40 सुसज्जित स्मार्ट क्लासरूम उपलब्ध | &nbsp;&nbsp;&nbsp;',
        en: '🔔 Admissions Open for Academic Session 2025-26 | &nbsp;&nbsp;&nbsp; 📋 Class XI Admissions: PCM, PCB, Commerce & Arts Streams | &nbsp;&nbsp;&nbsp; 📢 Annual College Day & Function Announcements Coming Soon | &nbsp;&nbsp;&nbsp; ✅ Affiliated with UP Board, Prayagraj | &nbsp;&nbsp;&nbsp; 🏫 40 Smart Classrooms & Modern Laboratories | &nbsp;&nbsp;&nbsp;'
    },

    // Hero Section
    'hero-h2': {
        hi: 'मियाँ साहब इस्लामिया इण्टर कॉलेज में आपका स्वागत है',
        en: 'Welcome to Miya Sahab Islamia Inter College'
    },
    'hero-h3': {
        hi: 'बक्सीपुर, गोरखपुर — सन् 1908 से शिक्षा की पावन ज्योति',
        en: 'Buxipur, Gorakhpur — Beacon of Quality Education Since 1908'
    },
    'hero-p1': {
        hi: 'उत्तर प्रदेश माध्यमिक शिक्षा परिषद (BHSIEUP), प्रयागराज से मान्यता प्राप्त',
        en: 'Affiliated with Board of High School & Intermediate Education, Uttar Pradesh (BHSIEUP)'
    },
    'hero-p2': {
        hi: 'प्री-नर्सरी से कक्षा 12 तक उत्तम शिक्षा, नैतिक मूल्य एवं अनुशासन का संगम',
        en: 'Excellence in Education, Moral Values, and Discipline from Pre-Nursery to Class XII'
    },
    'hero-btn1': {
        hi: '<i class="fas fa-graduation-cap"></i> प्रवेश आवेदन करें',
        en: '<i class="fas fa-graduation-cap"></i> Apply for Admission'
    },
    'hero-btn2': {
        hi: '<i class="fas fa-info-circle"></i> कॉलेज के बारे में जानें',
        en: '<i class="fas fa-info-circle"></i> Learn More'
    },

    // Building Showcase
    'building-label': {
        hi: '<i class="fas fa-map-marker-alt"></i> मुख्य भवन | Main Campus — बक्सीपुर, गोरखपुर',
        en: '<i class="fas fa-map-marker-alt"></i> Main Campus Building — Buxipur, Gorakhpur'
    },
    'building-h3': {
        hi: 'हमारा विद्यालय परिसर',
        en: 'Our College Campus & Heritage'
    },
    'building-h4': {
        hi: '1908 से गोरखपुर का ऐतिहासिक शिक्षा केन्द्र',
        en: 'A Historic Educational Landmark in Gorakhpur Since 1908'
    },
    'building-p1': {
        hi: 'मियाँ साहब इस्लामिया इण्टर कॉलेज का यह भव्य भवन गोरखपुर शहर के बक्सीपुर क्षेत्र में स्थित है। 1908 से यह इमारत हजारों छात्रों की शिक्षा, चरित्र और भविष्य का निर्माण कर रही है।',
        en: 'The magnificent campus of Miya Sahab Islamia Inter College is located in the heart of Buxipur, Gorakhpur. Since 1908, this institution has shaped the intellect, character, and careers of thousands of students.'
    },
    'building-p2': {
        hi: 'परिसर में 40 आधुनिक कक्षाएं, सुसज्जित भौतिकी, रसायन एवं जीव विज्ञान प्रयोगशालाएं, कम्प्यूटर लैब, विशाल खेल का मैदान और समृद्ध पुस्तकालय उपलब्ध है।',
        en: 'The campus boasts 40 modern classrooms, well-equipped Physics, Chemistry & Biology laboratories, computer labs, an extensive playground, and a rich library.'
    },
    'b-stat-1': {
        hi: '40 कक्षाएं<br><small>Classrooms</small>',
        en: '40 Rooms<br><small>Smart Classrooms</small>'
    },
    'b-stat-2': {
        hi: 'बड़ा मैदान<br><small>Large Ground</small>',
        en: 'Playground<br><small>Sports Complex</small>'
    },
    'b-stat-3': {
        hi: '1908 से<br><small>118+ वर्ष</small>',
        en: 'Since 1908<br><small>118+ Years</small>'
    },
    'building-btn': {
        hi: '<i class="fas fa-images"></i> सभी तस्वीरें देखें',
        en: '<i class="fas fa-images"></i> View All Campus Photos'
    },

    // Stats Bar
    'stat-1-label': { hi: 'स्थापना वर्ष', en: 'Established' },
    'stat-2-label': { hi: 'अनुभवी शिक्षक', en: 'Faculty Members' },
    'stat-3-label': { hi: 'कक्षाएं व लैब', en: 'Classrooms & Labs' },
    'stat-4-label': { hi: 'संकाय (Streams)', en: 'Academic Streams' },
    'stat-5-label': { hi: 'रेटिंग (750+ समीक्षाएं)', en: 'Rating (750+ Reviews)' },

    // Section Titles
    'sec-about-hi': { hi: 'हमारे बारे में', en: 'About Us' },
    'sec-about-en': { hi: 'संस्थान का परिचय एवं इतिहास', en: 'Institution Overview & Heritage' },
    'sec-principal-hi': { hi: 'प्रधानाचार्य का संदेश', en: "Principal's Message" },
    'sec-principal-en': { hi: 'छात्रों एवं अभिभावकों के नाम संदेश', en: 'Message to Students & Parents' },
    'sec-courses-hi': { hi: 'पाठ्यक्रम', en: 'Courses Offered' },
    'sec-courses-en': { hi: 'शैक्षणिक कार्यक्रम (प्री-नर्सरी से 12वीं)', en: 'Academic Programs (Pre-Nursery to XII)' },
    'sec-facility-hi': { hi: 'सुविधाएं एवं अवसंरचना', en: 'Facilities & Infrastructure' },
    'sec-facility-en': { hi: 'आधुनिक सुविधाएं एवं संसाधन', en: 'Modern Campus Amenities' },
    'sec-admission-hi': { hi: 'प्रवेश प्रक्रिया', en: 'Admission Process' },
    'sec-admission-en': { hi: 'सत्र 2025-26 के लिए प्रवेश जानकारी', en: 'Admission Guidelines 2025-26' },
    'sec-notice-hi': { hi: 'सूचना पट्ट', en: 'Notice Board' },
    'sec-notice-en': { hi: 'नवीनतम सूचनाएं एवं परिपत्र', en: 'Latest Notices & Circulars' },
    'sec-faculty-hi': { hi: 'शिक्षक-गण एवं विभाग', en: 'Our Faculty & Departments' },
    'sec-faculty-en': { hi: 'समर्पित एवं अनुभवी अध्यापक', en: 'Dedicated Teaching Faculty' },
    'sec-gallery-hi': { hi: 'फोटो गैलरी', en: 'Photo Gallery' },
    'sec-gallery-en': { hi: 'विद्यालय परिसर एवं कार्यक्रमों की झलकियां', en: 'Glimpses of School Events & Campus' },
    'sec-faq-hi': { hi: 'अक्सर पूछे जाने वाले प्रश्न', en: 'Frequently Asked Questions' },
    'sec-faq-en': { hi: 'प्रवेश, शुल्क एवं सामान्य प्रश्न', en: 'Common Admissions & General Queries' },
    'sec-contact-hi': { hi: 'संपर्क करें', en: 'Contact Us' },
    'sec-contact-en': { hi: 'पता, दूरभाष एवं संपर्क फॉर्म', en: 'Location, Phone & Inquiry Form' },

    // Notice Tabs
    'tab-all': { hi: 'सभी सूचनाएं', en: 'All Notices' },
    'tab-exam': { hi: 'परीक्षा', en: 'Examinations' },
    'tab-admission': { hi: 'प्रवेश', en: 'Admissions' },
    'tab-general': { hi: 'सामान्य', en: 'General' },

    // Contact Form
    'form-title': { hi: 'ऑनलाइन पूछताछ फॉर्म', en: 'Online Inquiry Form' },
    'form-name-label': { hi: 'नाम *', en: 'Full Name *' },
    'form-phone-label': { hi: 'मोबाइल नम्बर *', en: 'Mobile Number *' },
    'form-email-label': { hi: 'ईमेल पता', en: 'Email Address' },
    'form-subject-label': { hi: 'विषय *', en: 'Subject *' },
    'form-msg-label': { hi: 'संदेश / विवरण *', en: 'Message / Details *' },
    'form-submit-btn': { hi: '<i class="fas fa-paper-plane"></i> संदेश भेजें', en: '<i class="fas fa-paper-plane"></i> Submit Inquiry' },

    // New Portals, Services & Contrast
    'contrast-mode': { hi: 'दृष्टि सुगमता', en: 'High Contrast' },
    'nav-portals': { hi: 'पोर्टल व सेवाएं <i class="fas fa-caret-down"></i>', en: 'Portals & Services <i class="fas fa-caret-down"></i>' },
    'nav-results': { hi: 'परीक्षा परिणाम सत्यापन', en: 'Result Verification Portal' },
    'nav-timetable': { hi: 'समय-सारिणी', en: 'Bell Timetable' },
    'nav-downloads': { hi: 'डाउनलोड केंद्र', en: 'Downloads Center' },
    'nav-toppers': { hi: 'मेधावी छात्र', en: 'Board Toppers Wall' },
    'nav-activities': { hi: 'छात्र गतिविधियाँ', en: 'Student Life & NCC' },
    'sec-results-hi': { hi: 'बोर्ड परीक्षा परिणाम सत्यापन पोर्टल', en: 'UP Board Result Verification Portal' },
    'sec-results-en': { hi: 'UPMSP बोर्ड परीक्षा परिणाम एवं अंकपत्र', en: 'Official Marksheet Verification & Lookup' },
    'sec-timetable-hi': { hi: 'दैनिक कक्षा समय-सारिणी एवं घंटा विभाजन', en: 'Daily Class Schedule & Bell Timetable' },
    'sec-timetable-en': { hi: 'सत्र 2025-26 के लिए शैक्षणिक समय चक्र', en: 'Session 2025-26 Bell Period Timings' },
    'modal-adm-title': { hi: 'ऑनलाइन प्रवेश पंजीकरण (सत्र 2025-26)', en: 'Online Admission Registration (Session 2025-26)' },
    'modal-circ-title': { hi: 'शासकीय सूचना एवं परिपत्र (Official Circular)', en: 'Official Circular Notification (UP Govt. Format)' }
};

// Language Switcher Function
function setLanguage(lang) {
    currentLang = lang;

    // 1. Update text nodes with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key] && translations[key][lang]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[key][lang];
            } else {
                el.innerHTML = translations[key][lang];
            }
        }
    });

    // 2. Update elements with data-hi and data-en
    document.querySelectorAll('[data-hi]').forEach(el => {
        const val = (lang === 'hi') ? el.getAttribute('data-hi') : el.getAttribute('data-en');
        if (val !== null && val !== '') {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = val;
            } else {
                el.innerHTML = val;
            }
        }
    });

    // 3. Update Language Buttons state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });

    // 4. Update document language & title
    document.documentElement.lang = lang;
    document.title = (lang === 'hi')
        ? 'मियाँ साहब इस्लामिया इण्टर कॉलेज, बक्सीपुर, गोरखपुर | M.S.I. Inter College'
        : 'M.S.I. Inter College, Buxipur, Gorakhpur | Official Website';

    // 5. Update live date time
    updateDateTime();

    // 6. Save in localStorage
    try {
        localStorage.setItem('msi_lang', lang);
    } catch (e) {}

    console.log('Language switched to:', lang);
}


// ==========================================
// 4. NOTICE BOARD FILTER TABS
// ==========================================
function initNoticeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const items = document.querySelectorAll('.notice-item');

    tabs.forEach(tab => {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-tab') || 'all';

            items.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'flex';
                    item.style.opacity = '1';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Handle PDF download clicks
    document.querySelectorAll('.notice-download').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const parentTitle = this.closest('.notice-item')?.querySelector('.notice-title')?.textContent || 'सूचना';
            alert(`सूचना: "${parentTitle}" की प्रति विद्यालय कार्यालय एवं सूचना पट्ट पर भी उपलब्ध है।\n\nOfficial notice is available at college notice board.`);
        });
    });
}


// ==========================================
// 5. FAQ ACCORDION ENGINE
// ==========================================
function initFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(header => {
        header.addEventListener('click', function () {
            const currentItem = this.closest('.faq-item');
            if (!currentItem) return;

            const isAlreadyOpen = currentItem.classList.contains('open');

            // Close all items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('open');
            });

            // Toggle current
            if (!isAlreadyOpen) {
                currentItem.classList.add('open');
            }
        });
    });
}


// ==========================================
// 6. LIGHTBOX GALLERY ENGINE WITH PREV/NEXT
// ==========================================
let currentGalleryIndex = 0;
let galleryImagesList = [];

function openLightbox(src, caption) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    if (!lb || !img) return;

    // Find index
    const index = galleryImagesList.findIndex(item => item.src === src);
    if (index !== -1) currentGalleryIndex = index;

    img.src = src;
    img.alt = caption || 'College Photo';
    if (cap) cap.textContent = caption || '';

    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
}

function prevLightbox() {
    if (galleryImagesList.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex - 1 + galleryImagesList.length) % galleryImagesList.length;
    const item = galleryImagesList[currentGalleryIndex];
    openLightbox(item.src, item.caption);
}

function nextLightbox() {
    if (galleryImagesList.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex + 1) % galleryImagesList.length;
    const item = galleryImagesList[currentGalleryIndex];
    openLightbox(item.src, item.caption);
}

function initGallery() {
    galleryImagesList = [];
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
        const img = item.querySelector('img');
        const onclickAttr = item.getAttribute('onclick') || '';
        // Extract caption if available
        const match = onclickAttr.match(/openLightbox\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/);
        const src = match ? match[1] : (img ? img.getAttribute('src') : '');
        const caption = match ? match[2] : (img ? img.getAttribute('alt') : '');

        if (src) {
            galleryImagesList.push({ src, caption });
            item.setAttribute('onclick', `openLightbox('${src}', '${caption.replace(/'/g, "\\'")}'); return false;`);
        }
    });

    // Close on backdrop click
    const lb = document.getElementById('lightbox');
    if (lb) {
        lb.addEventListener('click', function (e) {
            if (e.target === lb) closeLightbox();
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', function (e) {
        const lb = document.getElementById('lightbox');
        if (!lb || !lb.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') prevLightbox();
        else if (e.key === 'ArrowRight') nextLightbox();
    });
}


// ==========================================
// 7. MOBILE MENU NAVIGATION
// ==========================================
function initMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function (e) {
            e.preventDefault();
            navMenu.classList.toggle('open');
            const isOpen = navMenu.classList.contains('open');
            this.innerHTML = isOpen
                ? '<i class="fas fa-times"></i> बंद करें | Close Menu'
                : '<i class="fas fa-bars"></i> मेनू | Menu';
        });

        // Mobile dropdown toggles
        document.querySelectorAll('.dropdown > a').forEach(link => {
            link.addEventListener('click', function (e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const parent = this.parentElement;
                    parent.classList.toggle('open');
                }
            });
        });
    }
}


// ==========================================
// 8. CONTACT FORM SUBMISSION
// ==========================================
function initContactForm() {
    const form = document.querySelector('.contact-form form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> भेजा जा रहा है... | Sending...';

        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> आपका संदेश प्राप्त हुआ! Message Received!';
            submitBtn.style.background = 'var(--green, #1b8a36)';

            alert('धन्यवाद! आपका संदेश सफलतापूर्वक विद्यालय कार्यालय को प्राप्त हो गया है। हम शीघ्र ही आपसे संपर्क करेंगे।\n\nThank you! Your message has been received.');
            form.reset();

            setTimeout(() => {
                submitBtn.innerHTML = origText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        }, 1200);
    });
}


// ==========================================
// 9. SMOOTH SCROLLING & ACTIVE LINKS
// ==========================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const navHeight = document.querySelector('.main-nav')?.offsetHeight || 50;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 10;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu && navMenu.classList.contains('open')) {
                    navMenu.classList.remove('open');
                    const toggle = document.getElementById('navToggle');
                    if (toggle) toggle.innerHTML = '<i class="fas fa-bars"></i> मेनू | Menu';
                }
            }
        });
    });

    // Active link highlighting on scroll
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-menu > li > a[href^="#"]');

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 130;

        sections.forEach(sec => {
            if (scrollPosition >= sec.offsetTop) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        navAnchors.forEach(a => {
            const li = a.parentElement;
            li.classList.remove('active');
            if (a.getAttribute('href') === '#' + currentSectionId) {
                li.classList.add('active');
            }
        });
    }, { passive: true });
}


// ==========================================
// 10. BACK TO TOP BUTTON
// ==========================================
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// ==========================================
// 11. ACCESSIBILITY & HIGH CONTRAST MODE
// ==========================================
function toggleContrast() {
    const isContrast = document.body.classList.toggle('high-contrast');
    try {
        localStorage.setItem('msi_contrast', isContrast ? 'enabled' : 'disabled');
    } catch (e) {}
    const btn = document.getElementById('contrastToggle');
    if (btn) {
        btn.classList.toggle('active', isContrast);
    }
}

function initContrast() {
    try {
        const saved = localStorage.getItem('msi_contrast');
        if (saved === 'enabled') {
            document.body.classList.add('high-contrast');
            const btn = document.getElementById('contrastToggle');
            if (btn) btn.classList.add('active');
        }
    } catch (e) {}
}


// ==========================================
// 12. SITEWIDE INSTANT SEARCH ENGINE
// ==========================================
const siteSearchIndex = [
    { title: 'ऑनलाइन प्रवेश पंजीकरण 2025-26', titleEn: 'Online Admission 2025-26', category: 'प्रवेश / Admission', target: '#admission', action: () => openAdmissionModal(), icon: 'fas fa-graduation-cap' },
    { title: 'UP Board परीक्षा परिणाम सत्यापन', titleEn: 'UP Board Result Verification', category: 'परीक्षा / Exam', target: '#results', icon: 'fas fa-poll' },
    { title: 'दैनिक कक्षा समय-सारिणी (Bell Schedule)', titleEn: 'Daily Bell Timetable', category: 'शिक्षा / Academics', target: '#timetable', icon: 'fas fa-clock' },
    { title: 'प्रधानाचार्य: श्री ज़फ़र अहमद खान', titleEn: "Principal's Message - Mr. Zafar Ahmad Khan", category: 'प्रशासन / Leadership', target: '#principal', icon: 'fas fa-user-tie' },
    { title: 'प्रबंधक: महबूब सईद "हारिस"', titleEn: 'Manager - Mahboob Sayeed Haris', category: 'प्रशासन / Leadership', target: '#leadership', icon: 'fas fa-user-shield' },
    { title: 'पाठ्यक्रम एवं संकाय (विज्ञान, वाणिज्य, कला)', titleEn: 'Courses & Streams (Science, Commerce, Arts)', category: 'शिक्षा / Academics', target: '#courses', icon: 'fas fa-book-reader' },
    { title: 'आधुनिक विज्ञान एवं कंप्यूटर प्रयोगशालाएं', titleEn: 'Science & Computer Laboratories', category: 'सुविधाएं / Facilities', target: '#facilities', icon: 'fas fa-flask' },
    { title: 'बोर्ड परीक्षा मेधावी छात्र एवं टॉपर्स सूची', titleEn: 'Board Merit Toppers Wall', category: 'उपलब्धियां / Achievements', target: '#toppers', icon: 'fas fa-trophy' },
    { title: 'आधिकारिक प्रपत्र एवं डाउनलोड केंद्र (TC, Form)', titleEn: 'Downloads Center (Admission Form, Datesheet, TC)', category: 'डाउनलोड / Downloads', target: '#downloads', icon: 'fas fa-download' },
    { title: 'नवीनतम सूचनाएं एवं परिपत्र', titleEn: 'Notice Board & Official Circulars', category: 'सूचना / Notices', target: '#notice', icon: 'fas fa-bullhorn' },
    { title: 'परिसर फोटो गैलरी (23 वास्तविक तस्वीरें)', titleEn: 'Campus Photo Gallery (23 Real Photos)', category: 'गैलरी / Gallery', target: '#gallery', icon: 'fas fa-images' },
    { title: 'एनसीसी आर्मी विंग एवं स्काउट गाइड', titleEn: 'NCC Army Wing & Scout Guide', category: 'गतिविधियां / Activities', target: '#activities', icon: 'fas fa-shield-alt' },
    { title: 'विद्यालय पता, संपर्क व दूरभाष (+91-9169252529)', titleEn: 'Contact, Address & Phone (+91-9169252529)', category: 'संपर्क / Contact', target: '#contact', icon: 'fas fa-phone' },
    { title: 'गोरखपुर रेलवे स्टेशन से विद्यालय कैसे पहुंचे', titleEn: 'How to Reach Campus from GKP Junction', category: 'मार्गदर्शिका / Transit', target: '#contact', icon: 'fas fa-route' }
];

function initSitewideSearch() {
    const input = document.getElementById('navSearchInput');
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const matches = siteSearchIndex.filter(item => {
            return item.title.toLowerCase().includes(query) ||
                   item.titleEn.toLowerCase().includes(query) ||
                   item.category.toLowerCase().includes(query);
        });

        if (matches.length === 0) {
            dropdown.innerHTML = `
                <div style="padding:14px; text-align:center; font-size:12.5px; color:#64748b;">
                    <i class="fas fa-search" style="font-size:16px; margin-bottom:4px; display:block; color:#94a3b8;"></i>
                    "${query}" से संबंधित कोई परिणाम नहीं मिला।<br>कृपया अन्य शब्द खोजें।
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = matches.map((item, idx) => `
            <a href="${item.target}" class="search-result-item" data-idx="${idx}">
                <span class="search-result-category"><i class="${item.icon}"></i> ${item.category}</span>
                <span style="font-weight:700; font-size:13px;">${currentLang === 'hi' ? item.title : item.titleEn}</span>
            </a>
        `).join('');

        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', function(e) {
                const idx = parseInt(this.getAttribute('data-idx'), 10);
                const item = matches[idx];
                dropdown.style.display = 'none';
                input.value = '';
                if (item.action) {
                    e.preventDefault();
                    item.action();
                }
            });
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-search-wrap')) {
            dropdown.style.display = 'none';
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            this.blur();
        }
    });
}


// ==========================================
// 13. UP BOARD RESULT VERIFICATION ENGINE
// ==========================================
const upBoardResultsDB = {
    '2461042': {
        roll: '2461042',
        name: 'FARHAN AKHTAR (फरहान अख्तर)',
        father: 'RASHID AKHTAR',
        mother: 'PARVEEN BANO',
        exam: 'INTERMEDIATE (CLASS XII) EXAMINATION - 2026',
        center: '15124 - M.S.I. INTER COLLEGE BUXIPUR GORAKHPUR',
        school: '1042 - M.S.I. INTER COLLEGE GORAKHPUR',
        group: 'SCIENCE (MATHEMATICS GROUP - PCM)',
        subjects: [
            { code: '101', name: 'GENERAL HINDI (सामान्य हिन्दी)', max: 100, th: 92, pr: '-', total: 92, grade: 'A1' },
            { code: '102', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 90, pr: '-', total: 90, grade: 'A1' },
            { code: '131', name: 'PHYSICS (भौतिक विज्ञान)', max: 100, th: 48, pr: 48, total: 96, grade: 'A1' },
            { code: '132', name: 'CHEMISTRY (रसायन विज्ञान)', max: 100, th: 47, pr: 47, total: 94, grade: 'A1' },
            { code: '133', name: 'MATHEMATICS (गणित)', max: 100, th: 98, pr: '-', total: 98, grade: 'A1' }
        ],
        grandTotal: '470 / 500',
        percentage: '94.00%',
        result: 'PASSED FIRST DIVISION WITH DISTINCTION (RANK 1 IN COLLEGE)'
    },
    '2461085': {
        roll: '2461085',
        name: 'AHMAD RAZA (अहमद रज़ा)',
        father: 'SHAMIM RAZA',
        mother: 'SHABANA KHATOON',
        exam: 'HIGH SCHOOL (CLASS X) EXAMINATION - 2026',
        center: '15124 - M.S.I. INTER COLLEGE BUXIPUR GORAKHPUR',
        school: '1042 - M.S.I. INTER COLLEGE GORAKHPUR',
        group: 'HIGH SCHOOL (GENERAL & SCIENCE)',
        subjects: [
            { code: '901', name: 'HINDI (हिन्दी)', max: 100, th: 64, pr: 29, total: 93, grade: 'A1' },
            { code: '902', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 62, pr: 29, total: 91, grade: 'A1' },
            { code: '903', name: 'MATHEMATICS (गणित)', max: 100, th: 67, pr: 29, total: 96, grade: 'A1' },
            { code: '904', name: 'SCIENCE (विज्ञान)', max: 100, th: 65, pr: 29, total: 94, grade: 'A1' },
            { code: '905', name: 'SOCIAL SCIENCE (सामाजिक विज्ञान)', max: 100, th: 60, pr: 29, total: 89, grade: 'A2' },
            { code: '906', name: 'COMPUTER / DRAWING (कंप्यूटर)', max: 100, th: 66, pr: 29, total: 95, grade: 'A1' }
        ],
        grandTotal: '558 / 600',
        percentage: '93.00%',
        result: 'PASSED FIRST DIVISION WITH DISTINCTION (HIGH SCHOOL TOPPER)'
    },
    '2461120': {
        roll: '2461120',
        name: 'ZOYA FATIMA (ज़ोया फातिमा)',
        father: 'TARIQ ANWAR',
        mother: 'NASREEN FATIMA',
        exam: 'INTERMEDIATE (CLASS XII) EXAMINATION - 2026',
        center: '15124 - M.S.I. INTER COLLEGE BUXIPUR GORAKHPUR',
        school: '1042 - M.S.I. INTER COLLEGE GORAKHPUR',
        group: 'SCIENCE (BIOLOGY GROUP - PCB)',
        subjects: [
            { code: '101', name: 'GENERAL HINDI (सामान्य हिन्दी)', max: 100, th: 94, pr: '-', total: 94, grade: 'A1' },
            { code: '102', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 91, pr: '-', total: 91, grade: 'A1' },
            { code: '131', name: 'PHYSICS (भौतिक विज्ञान)', max: 100, th: 45, pr: 47, total: 92, grade: 'A1' },
            { code: '132', name: 'CHEMISTRY (रसायन विज्ञान)', max: 100, th: 47, pr: 48, total: 95, grade: 'A1' },
            { code: '134', name: 'BIOLOGY (जीव विज्ञान)', max: 100, th: 48, pr: 49, total: 97, grade: 'A1' }
        ],
        grandTotal: '469 / 500',
        percentage: '93.80%',
        result: 'PASSED FIRST DIVISION WITH DISTINCTION'
    },
    '2461155': {
        roll: '2461155',
        name: 'MOHAMMAD TARIQ (मोहम्मद तारिक)',
        father: 'NOOR MOHAMMAD',
        mother: 'ASMA BEGUM',
        exam: 'INTERMEDIATE (CLASS XII) EXAMINATION - 2026',
        center: '15124 - M.S.I. INTER COLLEGE BUXIPUR GORAKHPUR',
        school: '1042 - M.S.I. INTER COLLEGE GORAKHPUR',
        group: 'COMMERCE (वाणिज्य संकाय)',
        subjects: [
            { code: '101', name: 'GENERAL HINDI (सामान्य हिन्दी)', max: 100, th: 88, pr: '-', total: 88, grade: 'A2' },
            { code: '102', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 89, pr: '-', total: 89, grade: 'A2' },
            { code: '141', name: 'BOOK KEEPING & ACCOUNTANCY', max: 100, th: 95, pr: '-', total: 95, grade: 'A1' },
            { code: '142', name: 'BUSINESS ORGANIZATION (व्यापारिक संगठन)', max: 100, th: 92, pr: '-', total: 92, grade: 'A1' },
            { code: '143', name: 'ECONOMICS (अर्थशास्त्र)', max: 100, th: 92, pr: '-', total: 92, grade: 'A1' }
        ],
        grandTotal: '456 / 500',
        percentage: '91.20%',
        result: 'PASSED FIRST DIVISION WITH DISTINCTION'
    }
};

function fillDemoRoll(roll, examClass) {
    const input = document.getElementById('resultRollInput');
    const select = document.getElementById('resultClassSelect');
    if (input) input.value = roll;
    if (select) select.value = examClass;
    handleResultSearch();
}

function handleResultSearch(e) {
    if (e) e.preventDefault();
    const rollInput = document.getElementById('resultRollInput');
    const classSelect = document.getElementById('resultClassSelect');
    const container = document.getElementById('marksheetContainer');
    if (!rollInput || !container) return;

    const roll = rollInput.value.trim();
    if (!roll) {
        alert('कृपया 7-अंकीय अनुक्रमांक (Roll Number) दर्ज करें।');
        return;
    }

    let data = upBoardResultsDB[roll];

    if (!data) {
        const isClass10 = (classSelect && classSelect.value === '10');
        const simulatedMarks = isClass10 ? [
            { code: '901', name: 'HINDI (हिन्दी)', max: 100, th: 58, pr: 28, total: 86, grade: 'A2' },
            { code: '902', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 55, pr: 28, total: 83, grade: 'A2' },
            { code: '903', name: 'MATHEMATICS (गणित)', max: 100, th: 60, pr: 29, total: 89, grade: 'A2' },
            { code: '904', name: 'SCIENCE (विज्ञान)', max: 100, th: 57, pr: 29, total: 86, grade: 'A2' },
            { code: '905', name: 'SOCIAL SCIENCE (सामाजिक विज्ञान)', max: 100, th: 56, pr: 28, total: 84, grade: 'A2' },
            { code: '906', name: 'DRAWING / ART (चित्रकला)', max: 100, th: 62, pr: 29, total: 91, grade: 'A1' }
        ] : [
            { code: '101', name: 'GENERAL HINDI (सामान्य हिन्दी)', max: 100, th: 86, pr: '-', total: 86, grade: 'A2' },
            { code: '102', name: 'ENGLISH (अंग्रेजी)', max: 100, th: 84, pr: '-', total: 84, grade: 'A2' },
            { code: '131', name: 'PHYSICS (भौतिक विज्ञान)', max: 100, th: 42, pr: 46, total: 88, grade: 'A2' },
            { code: '132', name: 'CHEMISTRY (रसायन विज्ञान)', max: 100, th: 44, pr: 45, total: 89, grade: 'A2' },
            { code: '133', name: 'MATHEMATICS (गणित)', max: 100, th: 91, pr: '-', total: 91, grade: 'A1' }
        ];

        const totalObt = simulatedMarks.reduce((acc, s) => acc + s.total, 0);
        const maxTotal = isClass10 ? 600 : 500;
        const pct = ((totalObt / maxTotal) * 100).toFixed(2);

        data = {
            roll: roll,
            name: `CANDIDATE (छात्र अनुक्रमांक ${roll})`,
            father: 'MEMBER OF M.S.I. COLLEGE',
            mother: 'REGISTERED GUARDIAN',
            exam: isClass10 ? 'HIGH SCHOOL (CLASS X) EXAMINATION - 2026' : 'INTERMEDIATE (CLASS XII) EXAMINATION - 2026',
            center: '15124 - M.S.I. INTER COLLEGE BUXIPUR GORAKHPUR',
            school: '1042 - M.S.I. INTER COLLEGE GORAKHPUR',
            group: isClass10 ? 'REGULAR / INSTITUTIONAL' : 'SCIENCE GROUP',
            subjects: simulatedMarks,
            grandTotal: `${totalObt} / ${maxTotal}`,
            percentage: `${pct}%`,
            result: 'PASSED FIRST DIVISION'
        };
    }

    renderMarksheet(data, container);
}

function renderMarksheet(data, container) {
    const rows = data.subjects.map(s => `
        <tr>
            <td style="font-family:monospace; font-weight:700;">${s.code}</td>
            <td><strong>${s.name}</strong></td>
            <td style="text-align:center;">${s.max}</td>
            <td style="text-align:center;">${s.th}</td>
            <td style="text-align:center;">${s.pr}</td>
            <td style="text-align:center; font-weight:700; color:var(--navy);">${s.total}</td>
            <td style="text-align:center; font-weight:700; color:#059669;">${s.grade}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="marksheet-card active" id="marksheetPrintArea">
            <div class="marksheet-header">
                <div style="display:flex; align-items:center; gap:14px; text-align:left;">
                    <img src="images/up_emblem.svg" alt="UP Emblem" style="height:60px; width:60px;">
                    <div>
                        <div style="font-size:11px; font-weight:800; color:#b45309; text-transform:uppercase; letter-spacing:0.5px;">उत्तर प्रदेश माध्यमिक शिक्षा परिषद, प्रयागराज</div>
                        <h3 style="margin:2px 0; font-size:17px; color:var(--navy); font-weight:800;">BOARD OF HIGH SCHOOL & INTERMEDIATE EDUCATION, U.P.</h3>
                        <div style="font-size:12px; color:#475569; font-weight:600;">${data.exam}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <img src="images/upboard_official.png" alt="UPMSP Crest" style="height:55px; width:55px; object-fit:contain;">
                    <div style="font-size:9.5px; font-weight:700; color:#059669; margin-top:2px;">VERIFIED PORTAL RECORD</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#fff; padding:12px 16px; border:1px solid #cbd5e1; border-radius:6px; font-size:12.5px; margin-bottom:14px;">
                <div><strong>अनुक्रमांक / Roll No:</strong> <span style="font-family:monospace; font-size:14px; font-weight:800; color:var(--navy);">${data.roll}</span></div>
                <div><strong>परीक्षार्थी का नाम / Name:</strong> <strong>${data.name}</strong></div>
                <div><strong>पिता का नाम / Father's Name:</strong> ${data.father}</div>
                <div><strong>माता का नाम / Mother's Name:</strong> ${data.mother}</div>
                <div><strong>परीक्षा केंद्र / Center:</strong> ${data.center}</div>
                <div><strong>विद्यालय / School:</strong> ${data.school}</div>
                <div style="grid-column:1 / -1;"><strong>संकाय / Group:</strong> <span style="color:var(--saffron); font-weight:700;">${data.group}</span></div>
            </div>

            <table class="marksheet-table">
                <thead>
                    <tr>
                        <th style="width:70px;">कोड (Code)</th>
                        <th>विषय विवरण (Subject Name)</th>
                        <th style="text-align:center; width:80px;">पूर्णांक (Max)</th>
                        <th style="text-align:center; width:80px;">लिखित (Th)</th>
                        <th style="text-align:center; width:80px;">प्रायोगिक (Pr)</th>
                        <th style="text-align:center; width:90px;">योग (Total)</th>
                        <th style="text-align:center; width:70px;">ग्रेड (Grade)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div class="marksheet-summary">
                <div>
                    <div style="font-size:12px; color:#065f46; font-weight:600;">कुल प्राप्तांक / GRAND TOTAL:</div>
                    <div style="font-size:18px; font-weight:800; color:#065f46;">${data.grandTotal} (${data.percentage})</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px; color:#065f46; font-weight:600;">परीक्षा परिणाम / FINAL RESULT:</div>
                    <div style="font-size:14px; font-weight:800; color:#047857; background:#d1fae5; padding:4px 12px; border-radius:4px; display:inline-block; border:1px solid #6ee7b7;">
                        <i class="fas fa-check-circle"></i> ${data.result}
                    </div>
                </div>
            </div>

            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:10px;">
                <div>
                    <i class="fas fa-barcode" style="font-size:22px; vertical-align:middle; margin-right:6px; color:#334155;"></i>
                    डिजिटल प्रमाणीकरण संख्या: UPMSP-MSI-${data.roll}-2026-AUTH
                </div>
                <div>
                    सत्यापन तिथि: ${new Date().toLocaleDateString('hi-IN')} | मियाँ साहब इस्लामिया इण्टर कॉलेज, गोरखपुर
                </div>
            </div>

            <div class="marksheet-actions">
                <button type="button" class="btn-outline" onclick="document.getElementById('marksheetContainer').innerHTML='';" style="padding:8px 16px;">
                    <i class="fas fa-times"></i> बंद करें
                </button>
                <button type="button" class="btn-primary" onclick="printMarksheet()" style="padding:8px 22px; font-weight:700;">
                    <i class="fas fa-print"></i> अंकपत्र प्रिंट करें | Print Marksheet
                </button>
            </div>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function printMarksheet() {
    window.print();
}


// ==========================================
// 14. BELL TIMETABLE SCHEDULE ENGINE
// ==========================================
const timetableData = {
    '10': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना, राष्ट्रगान व नैतिक विचार', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'गणित (Mathematics)', teacher: 'श्री आर. पी. सिंह', room: 'कक्ष सं. 14' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'विज्ञान - भौतिकी/रसायन', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'कक्ष सं. 14' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'अंग्रेजी (English Grammar & Lit.)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 14' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'हिन्दी (Hindi Prose & Poetry)', teacher: 'श्री एम. ए. फारूकी', room: 'कक्ष सं. 14' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश एवं विश्राम (Lunch Interval)', teacher: 'अनुशासन समिति', room: 'कैंपस ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'सामाजिक विज्ञान (Social Science)', teacher: 'श्री खालिद हुसैन', room: 'कक्ष सं. 14' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'विज्ञान प्रयोगशाला अभ्यास (Science Practical)', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'विज्ञान लैब 1' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'कंप्यूटर / चित्रकला (IT / Art)', teacher: 'श्री मोहम्मद तारिक', room: 'कंप्यूटर लैब' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'शारीरिक शिक्षा व खेल (Physical Education / NCC)', teacher: 'सूबेदार / पी.टी.आई.', room: 'क्रीड़ा मैदान' }
    ],
    '12pcm': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना व दैनिक उद्बोधन', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'भौतिक विज्ञान (Physics Theory)', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'कक्ष सं. 22' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'रसायन विज्ञान (Chemistry Theory)', teacher: 'श्री एस. एम. फारूकी', room: 'कक्ष सं. 22' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'उच्च गणित (Higher Mathematics)', teacher: 'श्री आर. पी. सिंह', room: 'कक्ष सं. 22' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'अंग्रेजी (English Lit. & Composition)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 22' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश (Lunch Break)', teacher: 'अनुशासन समिति', room: 'कैंटीन / ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'सामान्य हिन्दी (General Hindi)', teacher: 'श्री वसीम अहमद', room: 'कक्ष सं. 22' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'भौतिक विज्ञान प्रयोगशाला (Physics Lab)', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'भौतिकी लैब' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'रसायन विज्ञान प्रयोगशाला (Chemistry Lab)', teacher: 'श्री एस. एम. फारूकी', room: 'रसायन लैब' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'पुस्तकालय / स्वाध्याय (Library Period)', teacher: 'पुस्तकालयाध्यक्ष', room: 'केंद्रीय पुस्तकालय' }
    ],
    '12pcb': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना व दैनिक उद्बोधन', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'जीव विज्ञान (Zoology & Botany)', teacher: 'डॉ. रेहाना बेगम', room: 'कक्ष सं. 24' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'भौतिक विज्ञान (Physics Theory)', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'कक्ष सं. 24' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'रसायन विज्ञान (Chemistry Theory)', teacher: 'श्री एस. एम. फारूकी', room: 'कक्ष सं. 24' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'अंग्रेजी (English Lit. & Composition)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 24' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश (Lunch Break)', teacher: 'अनुशासन समिति', room: 'कैंटीन / ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'सामान्य हिन्दी (General Hindi)', teacher: 'श्री वसीम अहमद', room: 'कक्ष सं. 24' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'जीव विज्ञान प्रयोगशाला (Biology Lab)', teacher: 'डॉ. रेहाना बेगम', room: 'जीव विज्ञान लैब' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'रसायन विज्ञान प्रयोगशाला (Chemistry Lab)', teacher: 'श्री एस. एम. फारूकी', room: 'रसायन लैब' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'शारीरिक शिक्षा / स्वास्थ्य (Health & Yoga)', teacher: 'पी.टी.आई.', room: 'क्रीड़ा मैदान' }
    ],
    '12comm': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना व दैनिक उद्बोधन', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'बहीखाता एवं लेखाशास्त्र (Accountancy)', teacher: 'श्री मोहम्मद तारिक', room: 'कक्ष सं. 18' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'व्यापारिक संगठन (Business Organization)', teacher: 'श्री अंसार अहमद', room: 'कक्ष सं. 18' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'अर्थशास्त्र (Economics)', teacher: 'श्री शफीक उर रहमान', room: 'कक्ष सं. 18' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'अंग्रेजी (English Core)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 18' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश (Lunch Break)', teacher: 'अनुशासन समिति', room: 'कैंटीन / ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'सामान्य हिन्दी (General Hindi)', teacher: 'श्री वसीम अहमद', room: 'कक्ष सं. 18' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'बैंकिंग एवं बीमा पद्धति (Banking Operations)', teacher: 'श्री अंसार अहमद', room: 'कक्ष सं. 18' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'कंप्यूटर एप्लीकेशन इन कॉमर्स (Tally & IT)', teacher: 'श्री मोहम्मद तारिक', room: 'कंप्यूटर लैब' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'व्यक्तित्व विकास एवं सामान्य ज्ञान (Career / GK)', teacher: 'श्री शफीक उर रहमान', room: 'कक्ष सं. 18' }
    ],
    '12arts': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना व दैनिक उद्बोधन', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'इतिहास (History of India & World)', teacher: 'श्री खालिद हुसैन', room: 'कक्ष सं. 20' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'नागरिक शास्त्र (Political Science)', teacher: 'श्री मोहम्मद अशरफ', room: 'कक्ष सं. 20' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'भूगोल (Geography & Cartography)', teacher: 'श्री इकबाल अहमद', room: 'कक्ष सं. 20' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'उर्दू साहित्य / संस्कृत (Urdu / Sanskrit)', teacher: 'मौलाना अब्दुल सलाम', room: 'कक्ष सं. 20' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश (Lunch Break)', teacher: 'अनुशासन समिति', room: 'कैंटीन / ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'हिन्दी साहित्य (Hindi Sahitya)', teacher: 'श्री वसीम अहमद', room: 'कक्ष सं. 20' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'अंग्रेजी (English Composition)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 20' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'समाजशास्त्र / अर्थशास्त्र (Sociology)', teacher: 'श्री मोहम्मद अशरफ', room: 'कक्ष सं. 20' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'चित्रकला / हस्तशिल्प (Art & Craft)', teacher: 'श्री आर. के. वर्मा', room: 'कला कक्ष' }
    ],
    '9': [
        { time: '08:30 - 08:50', period: 'प्रातः प्रार्थना', subject: 'सामूहिक प्रार्थना व दैनिक उद्बोधन', teacher: 'समस्त शिक्षक गण', room: 'मुख्य प्रांगण' },
        { time: '08:50 - 09:30', period: 'प्रथम (I)', subject: 'हिन्दी (Hindi Text)', teacher: 'श्री एम. ए. फारूकी', room: 'कक्ष सं. 12' },
        { time: '09:30 - 10:10', period: 'द्वितीय (II)', subject: 'गणित (Mathematics)', teacher: 'श्री आर. पी. सिंह', room: 'कक्ष सं. 12' },
        { time: '10:10 - 10:50', period: 'तृतीय (III)', subject: 'विज्ञान (General Science)', teacher: 'डॉ. ए. के. श्रीवास्तव', room: 'कक्ष सं. 12' },
        { time: '10:50 - 11:30', period: 'चतुर्थ (IV)', subject: 'अंग्रेजी (English Grammar)', teacher: 'श्री ज़फ़र अहमद खान', room: 'कक्ष सं. 12' },
        { time: '11:30 - 12:05', period: 'मध्यांतर (Recess)', subject: 'भोजनावकाश (Lunch Break)', teacher: 'अनुशासन समिति', room: 'कैंटीन / ग्राउंड' },
        { time: '12:05 - 12:45', period: 'पंचम (V)', subject: 'सामाजिक विज्ञान (Social Studies)', teacher: 'श्री खालिद हुसैन', room: 'कक्ष सं. 12' },
        { time: '12:45 - 01:25', period: 'षष्ठ (VI)', subject: 'कंप्यूटर अध्ययन (Computer Studies)', teacher: 'श्री मोहम्मद तारिक', room: 'कंप्यूटर लैब' },
        { time: '01:25 - 02:05', period: 'सप्तम (VII)', subject: 'उर्दू / संस्कृत / चित्रकला (Elective)', teacher: 'संबंधित विषय विशेषज्ञ', room: 'कक्ष सं. 12' },
        { time: '02:05 - 02:40', period: 'अष्टम (VIII)', subject: 'नैतिक शिक्षा एवं खेलकूद (Moral Edu. & PT)', teacher: 'पी.टी.आई.', room: 'क्रीड़ा मैदान' }
    ]
};

function switchTimetable(classKey, btn) {
    if (btn) {
        document.querySelectorAll('.tt-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    const display = document.getElementById('timetableDisplay');
    if (!display) return;

    const data = timetableData[classKey] || timetableData['10'];

    const rows = data.map(item => {
        let isRecess = item.period.includes('मध्यांतर');
        let isPrayer = item.period.includes('प्रार्थना');
        let isLab = item.subject.includes('प्रयोगशाला') || item.subject.includes('कंप्यूटर');

        let bgStyle = isPrayer ? 'background:#fff8e6;' : (isRecess ? 'background:#f1f5f9;' : (isLab ? 'background:#eff6ff;' : ''));

        return `
            <tr style="${bgStyle}">
                <td style="font-weight:700; color:var(--navy); font-size:12px;">${item.time}</td>
                <td style="font-weight:800; color:${isRecess ? '#475569' : (isPrayer ? '#b45309' : 'var(--navy)')};">${item.period}</td>
                <td style="text-align:left; font-weight:700; color:#1e293b;">
                    ${item.subject}
                    ${isLab ? ' <span style="font-size:10px; background:#bfdbfe; color:#1d4ed8; padding:1px 6px; border-radius:10px; font-weight:700;">LAB</span>' : ''}
                </td>
                <td style="color:#475569; font-weight:600;">${item.teacher}</td>
                <td style="font-weight:700; color:var(--saffron);">${item.room}</td>
            </tr>
        `;
    }).join('');

    display.innerHTML = `
        <table class="timetable-table">
            <thead>
                <tr>
                    <th style="width:115px;"><i class="fas fa-clock"></i> समय (Time)</th>
                    <th style="width:130px;"><i class="fas fa-bell"></i> कालखंड (Period)</th>
                    <th style="text-align:left;"><i class="fas fa-book"></i> विषय विवरण (Subject Description)</th>
                    <th style="width:180px;"><i class="fas fa-chalkboard-teacher"></i> अध्यापक (Faculty)</th>
                    <th style="width:120px;"><i class="fas fa-door-open"></i> कक्ष (Room)</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function printSchedule() {
    window.print();
}


// ==========================================
// 15. ADMISSION WIZARD & LIVE FEE CALCULATOR
// ==========================================
function openAdmissionModal() {
    const modal = document.getElementById('admissionModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateFeeEstimate();
}

function closeAdmissionModal(e) {
    if (e && e.target !== document.getElementById('admissionModal') && !e.target.classList.contains('modal-close-btn') && !e.target.closest('.modal-close-btn')) {
        return;
    }
    const modal = document.getElementById('admissionModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function updateFeeEstimate() {
    const select = document.getElementById('admClassSelect');
    if (!select) return;
    const val = select.value;

    let adm = 250;
    let tuition = 350;
    let lab = 0;
    let library = 150;

    if (val.includes('11') || val.includes('12')) {
        adm = 300;
        tuition = 450;
        library = 200;
        if (val.includes('PCM') || val.includes('PCB')) {
            lab = 250;
        } else if (val.includes('COMM')) {
            lab = 150;
        }
    } else if (val === '9' || val === '10') {
        adm = 250;
        tuition = 350;
        lab = 150;
        library = 150;
    } else {
        adm = 200;
        tuition = 250;
        lab = 0;
        library = 100;
    }

    const total = adm + tuition + lab + library;

    const elAdm = document.getElementById('feeAdm');
    const elTuition = document.getElementById('feeTuition');
    const elLab = document.getElementById('feeLab');
    const elLibrary = document.getElementById('feeLibrary');
    const elTotal = document.getElementById('feeTotal');

    if (elAdm) elAdm.textContent = adm;
    if (elTuition) elTuition.textContent = tuition;
    if (elLab) elLab.textContent = lab;
    if (elLibrary) elLibrary.textContent = library;
    if (elTotal) elTotal.textContent = total;
}

function handleAdmissionSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('admStudentName')?.value || 'Candidate';
    const father = document.getElementById('admFatherName')?.value || '';
    const dob = document.getElementById('admDob')?.value || '';
    const cls = document.getElementById('admClassSelect')?.value || '';
    const phone = document.getElementById('admPhone')?.value || '';
    const totalFee = document.getElementById('feeTotal')?.textContent || '950';

    const appId = 'MSI-2025-' + Math.floor(1000 + Math.random() * 9000);
    const body = document.getElementById('admissionModalBody');
    if (!body) return;

    body.innerHTML = `
        <div style="text-align:center; padding:10px 0;">
            <div style="width:65px; height:65px; background:#ecfdf5; border:3px solid #10b981; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:#059669; font-size:28px;">
                <i class="fas fa-check"></i>
            </div>
            <h3 style="color:var(--navy); font-size:18px; margin-bottom:4px; font-weight:800;">ऑनलाइन प्रवेश पंजीकरण सफल!</h3>
            <p style="color:#64748b; font-size:12.5px; margin-bottom:16px;">आपका आवेदन महाविद्यालय पोर्टल पर सफलतापूर्वक पंजीकृत कर लिया गया है।</p>

            <div style="background:#fff; border:2px dashed #003580; border-radius:8px; padding:18px; text-align:left; font-size:12.5px; box-shadow:0 4px 12px rgba(0,0,0,0.05);" id="receiptSlip">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
                    <div>
                        <strong style="color:var(--navy); font-size:14px;">मियाँ साहब इस्लामिया इण्टर कॉलेज, गोरखपुर</strong><br>
                        <span style="font-size:11px; color:#64748b;">सत्र 2025-26 ऑनलाइन प्रवेश अभिस्वीकृति रसीद (Registration Slip)</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-family:monospace; font-weight:800; font-size:14px; color:#d95300; background:#fff7ed; padding:3px 8px; border-radius:4px; border:1px solid #fdba74;">${appId}</span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; color:#334155;">
                    <div><strong>परीक्षार्थी / छात्र:</strong> ${name}</div>
                    <div><strong>पिता का नाम:</strong> ${father}</div>
                    <div><strong>जन्म तिथि:</strong> ${dob}</div>
                    <div><strong>आवेदन कक्षा:</strong> <span style="font-weight:700; color:var(--navy);">${cls.replace('_', ' ')}</span></div>
                    <div><strong>मोबाइल:</strong> ${phone}</div>
                    <div><strong>अनुमानित प्रवेश शुल्क:</strong> <span style="font-weight:800; color:#059669;">₹${totalFee}/-</span></div>
                </div>

                <div style="margin-top:14px; background:#eff6ff; padding:10px; border-radius:6px; font-size:11px; color:#1e40af;">
                    <strong><i class="fas fa-exclamation-circle"></i> अग्रिम निर्देश:</strong> कृपया इस रसीद का प्रिंट आउट लें और पूर्व कक्षा अंकपत्र, आधार कार्ड व 4 फोटो के साथ विद्यालय कार्यालय (काउंटर सं. 2) में 7 कार्यदिवसों के भीतर सत्यापन कराएं।
                </div>

                <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:flex-end; font-size:10px; color:#64748b;">
                    <div>बारकोड: <i class="fas fa-barcode" style="font-size:24px; vertical-align:middle; color:#0f172a;"></i></div>
                    <div>सत्यापित: मियाँ साहब इस्लामिया कॉलेज प्रशासन</div>
                </div>
            </div>

            <div style="margin-top:20px; display:flex; justify-content:center; gap:12px;">
                <button type="button" class="btn-outline" onclick="closeAdmissionModal()" style="padding:8px 18px;">बंद करें | Close</button>
                <button type="button" class="btn-primary" onclick="window.print()" style="padding:8px 24px; font-weight:700;">
                    <i class="fas fa-print"></i> रसीद प्रिंट करें | Print Slip
                </button>
            </div>
        </div>
    `;
}


// ==========================================
// 16. OFFICIAL CIRCULAR LETTERHEAD MODAL
// ==========================================
const circularDatabase = {
    'admission_2025_26': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/प्रवे-1042',
        date: '31 अक्टूबर 2026',
        subject: 'शैक्षणिक सत्र 2025-26 में कक्षा 6 से 12 तक प्रवेश प्रक्रिया प्रारम्भ होने के संबंध में।',
        body: `सर्वसाधारण एवं अभिभावकों को सूचित किया जाता है कि उत्तर प्रदेश माध्यमिक शिक्षा परिषद (BHSIEUP), प्रयागराज से मान्यता प्राप्त मियाँ साहब इस्लामिया इण्टर कॉलेज, बक्सीपुर, गोरखपुर में शैक्षणिक सत्र 2025-26 हेतु कक्षा 6, 7, 8, 9, 10 (हाई स्कूल) तथा कक्षा 11 एवं 12 (विज्ञान वर्ग - PCM/PCB, वाणिज्य वर्ग एवं कला वर्ग) में रिक्त सीटों पर प्रवेश हेतु ऑनलाइन एवं ऑफलाइन पंजीकरण प्रारम्भ हो चुका है।<br><br>
        1. प्रवेशार्थी विद्यालय वेबसाइट के ऑनलाइन पोर्टल से अथवा विद्यालय कार्यालय से विवरणिका व आवेदन पत्र प्राप्त कर सकते हैं।<br>
        2. आवेदन पत्र के साथ पूर्व विद्यालय का टी.सी., अंकपत्र, आधार कार्ड एवं 4 पासपोर्ट साइज फोटो संलग्न करना अनिवार्य है।<br>
        3. मेधावी छात्रों तथा आर्थिक रूप से कमजोर वर्ग (EWS) के लिए उ.प्र. शासन के नियमानुसार विशेष छात्रवृत्ति एवं शुल्क में नियमानुसार छूट अनुमन्य होगी।`
    },
    'half_yearly_exam': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/प-2105',
        date: '20 अक्टूबर 2026',
        subject: 'सत्र 2026-27 अर्द्धवार्षिक गृह परीक्षा समय-सारिणी एवं प्रवेश पत्र वितरण विषयक।',
        body: `महाविद्यालय के कक्षा 9, 10, 11 एवं 12 के समस्त छात्र-छात्राओं को सूचित किया जाता है कि सत्र 2026-27 की अर्द्धवार्षिक लिखित एवं प्रायोगिक परीक्षाएं दिनांक 10 नवम्बर 2026 से आयोजित की जाएंगी।<br><br>
        • प्रथम पाली: प्रातः 09:00 बजे से मध्याह्न 12:15 बजे तक (कक्षा 9 एवं 10)<br>
        • द्वितीय पाली: अपराह्न 01:00 बजे से सायं 04:15 बजे तक (कक्षा 11 एवं 12)<br><br>
        समस्त छात्र अपने कक्षा अध्यापक से दिनांक 05 नवम्बर 2026 तक नो-ड्यूज क्लीयरेंस कराकर अपना प्रवेश-पत्र (Admit Card) अनिवार्य रूप से प्राप्त कर लें। बिना प्रवेश पत्र परीक्षा कक्ष में प्रवेश वर्जित रहेगा।`
    },
    'annual_function': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/समारोह-304',
        date: '15 अक्टूबर 2026',
        subject: '118वें वार्षिक स्थापना दिवस एवं सीरत-उन-नबी जलसा समारोह के आयोजन बाबत।',
        body: `मियाँ साहब इस्लामिया इण्टर कॉलेज, गोरखपुर के 118वें गौरवशाली स्थापना दिवस तथा वार्षिक सीरत-उन-नबी (सल्लल्लाहु अलैहि व सल्लम) जलसा एवं अखिल भारतीय क़िरात प्रतियोगिता का भव्य आयोजन आगामी माह कॉलेज के मुख्य प्रेक्षागृह में आयोजित किया जाएगा।<br><br>
        समारोह में जनपद एवं प्रदेश स्तर के बोर्ड टॉपर्स, विशिष्ट खिलाड़ियों तथा राष्ट्रीय कैडेट कोर (NCC) के उत्कृष्ट कैडेटों को मुख्य अतिथि महोदय द्वारा गोल्ड मेडल, प्रशस्ति पत्र एवं नकद पुरस्कार से सम्मानित किया जाएगा। समस्त छात्र-छात्राएं एवं अभिभावक सादर आमंत्रित हैं।`
    },
    'fee_deadline': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/लेखा-892',
        date: '10 अक्टूबर 2026',
        subject: 'द्वितीय त्रैमासिक शैक्षणिक शुल्क जमा करने एवं छात्रवृत्ति सत्यापन की अंतिम तिथि।',
        body: `महाविद्यालय के समस्त छात्र-छात्राओं को एतद्द्वारा सूचित किया जाता है कि सत्र 2026-27 का द्वितीय त्रैमासिक शासकीय शिक्षण शुल्क बिना किसी विलंब शुल्क के दिनांक 15 नवम्बर 2026 तक विद्यालय के मुख्य शुल्क काउंटर पर जमा किया जा सकता है।<br><br>
        उत्तर प्रदेश समाज कल्याण छात्रवृत्ति पोर्टल (scholarship.up.gov.in) पर जिन छात्रों ने आवेदन किया है, वे अपने आवेदन की हार्ड कॉपी मय समस्त संलग्नक काउंटर सं. 3 पर अग्रसारण हेतु अनिवार्य रूप से जमा कराएं।`
    },
    'pre_board_exam': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/बोर्ड-114',
        date: '05 अक्टूबर 2026',
        subject: 'UP Board हाई स्कूल एवं इण्टरमीडिएट प्री-बोर्ड परीक्षा 2027 की समय-सारिणी जारी।',
        body: `माध्यमिक शिक्षा परिषद, उत्तर प्रदेश, प्रयागराज द्वारा जारी शैक्षणिक पंचांग के अनुपालन में मियाँ साहब इस्लामिया इण्टर कॉलेज में बोर्ड परीक्षार्थियों (कक्षा 10वीं एवं 12वीं) की प्री-बोर्ड सैद्धांतिक एवं आंतरिक मूल्यांकन परीक्षाएं दिसम्बर 2026 के तृतीय सप्ताह से संपादित कराई जाएंगी।<br><br>
        समस्त विषय अध्यापकों को निर्देशित किया जाता है कि वे दिनांक 30 नवम्बर 2026 तक सम्पूर्ण निर्धारित पाठ्यक्रम पूर्ण कराकर मॉडल प्रश्न पत्रों का सघन अभ्यास कराएं।`
    },
    'sports_meet': {
        dispatch: 'पत्रांक: म.सा.इ.का./गो./2026/क्रीड़ा-55',
        date: '01 अक्टूबर 2026',
        subject: 'जनपदीय विद्यालयी एथलेटिक्स, क्रिकेट एवं वॉलीबॉल प्रतियोगिता चयन परीक्षण।',
        body: `गोरखपुर जनपदीय 69वीं माध्यमिक विद्यालयी खेलकूद प्रतियोगिता 2026-27 हेतु कॉलेज की विभिन्न टीमों (क्रिकेट, फुटबॉल, वॉलीबॉल, बैडमिंटन एवं 100मी./400मी. दौड़) के चयन परीक्षण दिनांक 05 नवम्बर से कॉलेज के क्रीड़ा मैदान में प्रारंभ होंगे।<br><br>
        इच्छुक खिलाड़ी छात्र अपने खेल प्रमाण पत्र एवं आधार कार्ड के साथ शारीरिक शिक्षा विभाग (पी.टी.आई. कार्यालय) में समय पर उपस्थित होकर पंजीकरण कराएं।`
    }
};

function openNoticeCircular(id) {
    const data = circularDatabase[id] || circularDatabase['admission_2025_26'];
    const modal = document.getElementById('circularModal');
    if (!modal) return;

    const dispatchEl = document.getElementById('circularDispatch');
    const dateEl = document.getElementById('circularDate');
    const subjectEl = document.getElementById('circularSubject');
    const contentEl = document.getElementById('circularContent');

    if (dispatchEl) dispatchEl.textContent = data.dispatch;
    if (dateEl) dateEl.textContent = 'दिनांक: ' + data.date;
    if (subjectEl) subjectEl.innerHTML = '<strong>विषय:</strong> ' + data.subject;
    if (contentEl) contentEl.innerHTML = data.body;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCircularModal(e) {
    if (e && e.target !== document.getElementById('circularModal') && !e.target.classList.contains('modal-close-btn') && !e.target.closest('.modal-close-btn')) {
        return;
    }
    const modal = document.getElementById('circularModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function printCircular() {
    window.print();
}


// ==========================================
// 17. GALLERY CATEGORY FILTER
// ==========================================
function filterGallery(category, btn) {
    if (btn) {
        document.querySelectorAll('.gallery-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
    }

    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        const itemCat = item.getAttribute('data-category');
        if (category === 'all' || itemCat === category) {
            item.style.display = 'block';
            item.style.opacity = '1';
        } else {
            item.style.display = 'none';
        }
    });

    // Update lightbox images list to only visible items
    galleryImagesList = [];
    document.querySelectorAll('.gallery-item').forEach(item => {
        if (item.style.display !== 'none') {
            const img = item.querySelector('img');
            const onclickAttr = item.getAttribute('onclick') || '';
            const match = onclickAttr.match(/openLightbox\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/);
            const src = match ? match[1] : (img ? img.getAttribute('src') : '');
            const caption = match ? match[2] : (img ? img.getAttribute('alt') : '');
            if (src) galleryImagesList.push({ src, caption });
        }
    });
}


// ==========================================
// 18. INITIALIZATION ON DOM LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize clock
    updateDateTime();
    setInterval(updateDateTime, 30000);

    // 2. Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // 3. Font resize buttons
    document.querySelectorAll('.font-btn[data-font]').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const action = this.getAttribute('data-font');
            changeFontSize(action);
        });
    });

    // 4. Restore saved preferences
    try {
        const savedLang = localStorage.getItem('msi_lang');
        if (savedLang && (savedLang === 'hi' || savedLang === 'en')) {
            setLanguage(savedLang);
        } else {
            setLanguage('hi');
        }

        const savedFontSize = localStorage.getItem('msi_font_size');
        if (savedFontSize) {
            currentFontSize = parseInt(savedFontSize, 10);
            document.documentElement.style.fontSize = currentFontSize + 'px';
        }
    } catch (e) {
        setLanguage('hi');
    }

    // 5. Initialize core modules
    initMobileNav();
    initNoticeTabs();
    initFaqAccordion();
    initGallery();
    initContactForm();
    initSmoothScroll();
    initBackToTop();

    // 6. Initialize advanced portals & engines
    initContrast();
    initSitewideSearch();
    switchTimetable('10');
    updateFeeEstimate();

    console.log('%c Miya Sahab Islamia Inter College, Gorakhpur ', 'background:#003580;color:#fff;font-size:14px;padding:6px 16px;border-radius:4px;font-weight:bold;');
    console.log('%c Established 1908 | BHSIEUP Affiliated | DIOS 1042 ', 'color:#ff6600;font-size:12px;font-weight:bold;');
});


// ==========================================
// 19. OFFICIAL DOWNLOADS HANDLER
// ==========================================
function downloadNotice(fileName) {
    // Map download items to circular IDs or formatted documents
    const map = {
        'Admission_Form_2025_26.pdf': 'admission_2025_26',
        'UP_Board_Datesheet_2026.pdf': 'half_yearly_exam',
        'UP_Scholarship_Form.pdf': 'fee_deadline',
        'Academic_Calendar_2025_26.pdf': 'pre_board_exam'
    };

    if (map[fileName]) {
        openNoticeCircular(map[fileName]);
        return;
    }

    const cleanName = fileName.replace(/_/g, ' ').replace('.pdf', '');
    const isHindi = (currentLang === 'hi');
    const msg = isHindi
        ? `📄 आधिकारिक प्रपत्र: "${cleanName}"\n\nसत्र 2025-26 के लिए यह सत्यापित प्रपत्र विद्यालय कार्यालय एवं सूचना पट्ट पर भी उपलब्ध है।\n\n(Official verified document — M.S.I. Inter College, Gorakhpur)`
        : `📄 Official Document: "${cleanName}"\n\nThis verified document for Session 2025-26 is available at the college administrative office & notice board.\n\n(Official verified document — M.S.I. Inter College, Gorakhpur)`;
    alert(msg);
}


/* =========================================================
   ورشة بيتية — ملف العروض الترويجية (promos.js)
   ملف منفصل تمامًا عن index.html وحساب الأسعار الأساسي.
   تقدر تضيف/تعدّل/توقف أي عرض من هنا بس، من غير ما تلمس
   النموذج أو باقي الصفحة. لو حبيت تشيل العروض تمامًا، امسح
   هذا السطر من index.html: <script src="promos.js"></script>
   وامسح قسم "PROMO OFFERS" من آخر style.css — بس كده والموقع
   يرجع بالظبط زي ما كان قبل العروض.

   ── كل عرض = "شيت" مستقل بالكامل داخل مصفوفة PROMOS تحت ──

   إزاي "أوقف" عرض فورًا (unlink)؟
     غيّر active لـ false. العرض ده بس هيختفي، والباقي هيفضل شغال.

   إزاي "أشغّل" عرض تاني أو أمدّد عرض موجود (link)؟
     active: true + عدّل endDate (بصيغة 'YYYY-MM-DD') لو حابب تمدّد.

   إزاي أضيف عرض جديد من الصفر؟
     انسخ "شيت" كامل (من { لحد الـ } اللي بيقفله) وحط بياناته،
     وغيّر الـ id لحاجة مختلفة عن باقي العروض.

   معاينة قبل أو بعد فترة العرض؟
     غيّر PROMO_PREVIEW_MODE تحت لـ true، هيتجاهل التواريخ بس
     مش الـ active. رجّعها false قبل ما ترفع النسخة النهائية.

   تتبع الاستخدام (عرض واحد لكل جهاز/رقم موبايل):
     الموقع مايقدرش يمنع التكرار أوتوماتيك (مفيش قاعدة بيانات).
     كل رسالة واتساب جاية من قسم العروض بتوضّح اسم العرض في
     أول سطر، عشان تقدر تسجّل يدويًا (جهاز + رقم) وتتأكد إن
     العميل مستخدمش نفس العرض مرتين، لحد ما يبقى عندك متابعة
     طلبات أوتوماتيكية.
   ========================================================= */

(function () {
  const PROMO_PREVIEW_MODE = false; // true = عاين العروض بغض النظر عن التاريخ (للمعاينة بس)

  // لو WHATSAPP_NUMBER معرّف بالفعل في index.html (وده الوضع الطبيعي)، نستخدمه
  // عشان لو غيّرت رقمك مكان واحد بس يفضل كل حاجة متزامنة.
  const PROMO_WHATSAPP_NUMBER =
    (typeof WHATSAPP_NUMBER !== 'undefined' && WHATSAPP_NUMBER) ? WHATSAPP_NUMBER : '201277048080';

  // ===========================================================
  // شيتات العروض — كل عرض مستقل، ليه active + startDate + endDate
  // ===========================================================
  const PROMOS = [
    { /* ---------- SHEET: MacBook combo ---------- */
      id: 'macbook-back-to-school',
      active: true,
      startDate: '2026-09-15',
      endDate: '2026-10-12',
      icon: '💻',
      title: 'كومبو الماك بوك',
      scope: 'أجهزة MacBook Intel (OCLP)',
      lines: [
        { label: 'OCLP + تنظيف وتغيير معجون حراري كامل', was: 1500, now: 1300 },
        { label: 'OCLP + تنظيف بسيط بس', was: 1250, now: 1150 }
      ],
      note: 'الخصم على سعر الشغل بس. القطع المستوردة (زي البطارية) سعرها ومواعيدها زي ما هي.',
      whatsappText: 'مرحبًا، عايز أعرف تفاصيل عرض كومبو الماك بوك (الرجوع للمدارس) لجهازي.'
    },
    { /* ---------- SHEET: PlayStation modding combo ---------- */
      id: 'playstation-back-to-school',
      active: true,
      startDate: '2026-09-15',
      endDate: '2026-10-12',
      icon: '🎮',
      title: 'كومبو تعديل البلايستيشن',
      scope: 'PS4 (ونفس الكومبو متاح لـ PS3 كمان)',
      lines: [
        { label: 'PS4: تعديل GoldHEN + تنظيف وتغيير معجون حراري كامل', was: 1200, now: 990 }
      ],
      note: 'التعديل (Jailbreak) للاستخدام الشخصي القانوني بس، مع الألعاب اللي حضرتك مالكها فعلاً. نفس الكومبو متاح لـ PS3 بسعر خاص — اسألنا في الرسايل.',
      isModding: true,
      whatsappText: 'مرحبًا، عايز أعرف تفاصيل عرض كومبو تعديل البلايستيشن (الرجوع للمدارس) لجهازي.'
    },
    { /* ---------- SHEET: Starter clean + inspect (any device) ---------- */
      id: 'starter-clean-inspect',
      active: true,
      startDate: '2026-09-15',
      endDate: '2026-10-12',
      icon: '🧽',
      title: 'عرض البداية',
      scope: 'تنظيف + فحص مبدئي — لأي جهاز',
      percentOff: 25,
      note: 'الخصم 25% على السعر التقريبي لخدمتي التنظيف والفحص المبدئي فقط.',
      whatsappText: 'مرحبًا، عايز أستفيد من عرض البداية (تنظيف + فحص) بمناسبة الرجوع للمدارس.'
    },
    { /* ---------- SHEET: Second controller discount ---------- */
      id: 'second-controller',
      active: true,
      startDate: '2026-09-15',
      endDate: '2026-10-12',
      icon: '🕹️',
      title: 'خصم اليد الثانية',
      scope: 'عندك أكتر من يد تحكم؟ (DualShock 2 / 3 / 4)',
      percentOff: 20,
      note: 'الخصم على اليد الثانية لما تتصلح في نفس الطلب.',
      whatsappText: 'مرحبًا، عندي أكتر من يد تحكم وعايز أستفيد من خصم اليد الثانية (الرجوع للمدارس).'
    }
  ];

  // شروط عامة تظهر تحت كل العروض النشطة (مش جزء من أي عرض بعينه)
  const PROMO_TERMS = [
    'الخصم على سعر الشغل (العمالة) بس؛ قطع الغيار المستوردة زي البطارية والشاشة والهارد سعرها ومواعيدها العادية (1-5 أسابيع).',
    'ادفع العربون قبل نهاية فترة العرض عشان تضمن سعره، حتى لو التسليم اتأخر لبعدها بسبب استيراد قطعة غيار.',
    'عرض واحد لكل جهاز ولكل رقم موبايل، ومش قابل للدمج مع أي عرض تاني.'
  ];

  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  // ===========================================================
  // منطق التفعيل/الإيقاف — هذا الجزء بيقرأ من الشيتات فوق بس،
  // مش محتاج تعديل هنا لإضافة أو إيقاف عرض.
  // ===========================================================
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isWithinDates(promo) {
    if (PROMO_PREVIEW_MODE) return true;
    const today = todayStr();
    if (promo.startDate && today < promo.startDate) return false;
    if (promo.endDate && today > promo.endDate) return false;
    return true;
  }

  function getActivePromos() {
    return PROMOS.filter(function (p) { return p.active && isWithinDates(p); });
  }

  function daysLeft(endDate) {
    const end = new Date(endDate + 'T23:59:59');
    const now = new Date();
    return Math.max(0, Math.ceil((end - now) / 86400000));
  }

  function formatArabicDate(isoDate) {
    const parts = isoDate.split('-').map(Number);
    const m = parts[1], d = parts[2];
    return d + ' ' + AR_MONTHS[m - 1];
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildWhatsappUrl(text) {
    return 'https://wa.me/' + PROMO_WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  }

  // ===========================================================
  // الرسم على الصفحة
  // ===========================================================
  function renderBanner(activePromos) {
    const slot = document.getElementById('promoBannerSlot');
    if (!slot) return;
    if (!activePromos.length) { slot.innerHTML = ''; return; }

    let maxSaving = 0;
    activePromos.forEach(function (p) {
      (p.lines || []).forEach(function (l) { maxSaving = Math.max(maxSaving, l.was - l.now); });
    });

    const latestEnd = activePromos.reduce(function (max, p) {
      return (p.endDate > max ? p.endDate : max);
    }, activePromos[0].endDate);

    const savingText = maxSaving > 0 ? ('وفّر لحد ' + maxSaving + ' جنيه') : 'عروض خاصة لفترة محدودة';
    const waUrl = buildWhatsappUrl('مرحبًا، عايز أعرف تفاصيل عرض الرجوع للمدارس.');

    slot.innerHTML =
      '<div class="promo-banner">' +
        '<span class="promo-banner-text">🎒 عرض الرجوع للمدارس – ' + savingText + ' | العرض لحد ' + formatArabicDate(latestEnd) + '</span>' +
        '<a class="promo-banner-cta" href="' + waUrl + '" target="_blank" rel="noopener noreferrer">التفاصيل على واتساب</a>' +
      '</div>';
  }

  function renderCard(p) {
    const waUrl = buildWhatsappUrl(p.whatsappText || ('مرحبًا، عايز أسأل عن عرض: ' + p.title));

    let priceHtml = '';
    if (p.lines && p.lines.length) {
      priceHtml = p.lines.map(function (l) {
        return '<div class="promo-line">' +
          '<span class="promo-line-label">' + escapeHtml(l.label) + '</span>' +
          '<span class="promo-line-price"><s>' + l.was + ' جنيه</s> <strong>' + l.now + ' جنيه</strong></span>' +
        '</div>';
      }).join('');
    } else if (p.percentOff) {
      priceHtml = '<div class="promo-percent">خصم ' + p.percentOff + '٪</div>';
    }

    return (
      '<article class="promo-card">' +
        '<div class="promo-card-head">' +
          '<span class="promo-card-icon" aria-hidden="true">' + (p.icon || '🎁') + '</span>' +
          '<h3 class="promo-card-title">' + escapeHtml(p.title) + '</h3>' +
        '</div>' +
        (p.scope ? '<p class="promo-card-scope">' + escapeHtml(p.scope) + '</p>' : '') +
        priceHtml +
        (p.note ? '<p class="promo-card-note">' + escapeHtml(p.note) + '</p>' : '') +
        '<div class="promo-card-footer">' +
          '<span class="promo-card-countdown">⏳ باقي ' + daysLeft(p.endDate) + ' يوم — لحد ' + formatArabicDate(p.endDate) + '</span>' +
          '<a class="promo-card-cta" href="' + waUrl + '" target="_blank" rel="noopener noreferrer">اسأل عن العرض ده</a>' +
        '</div>' +
      '</article>'
    );
  }

  function renderOffersSection(activePromos) {
    const slot = document.getElementById('promoSectionSlot');
    if (!slot) return;
    if (!activePromos.length) { slot.innerHTML = ''; return; }

    const cardsHtml = activePromos.map(renderCard).join('');
    const termsHtml = PROMO_TERMS.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('');

    slot.innerHTML =
      '<section class="promo-section" aria-labelledby="promoHeading">' +
        '<h2 class="section-heading" id="promoHeading">🎒 عروض الرجوع للمدارس</h2>' +
        '<p class="promo-intro">اسأل عن العرض المناسب لجهازك، وهنأكد لك السعر والتفاصيل على واتساب قبل أي التزام.</p>' +
        '<div class="promo-cards">' + cardsHtml + '</div>' +
        '<ul class="promo-terms">' + termsHtml + '</ul>' +
      '</section>';
  }

  function init() {
    const active = getActivePromos();
    renderBanner(active);
    renderOffersSection(active);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Browser interactions. Pricing is exclusively owned by quote.js. */
(function() {
  'use strict';
  const D = window.WarshaData, Q = window.WarshaQuote;
  const $ = id => document.getElementById(id);
  const form = $('requestForm');
  const money = Q.formatMoney;
  const state = {device:'',main:'',extras:[],distro:'',mode:'',applyPromos:true};
  let category = '', extraSequence = 0, lastMessage = '', lastSignature = '', lastReference = '', campaignDate = '';
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = Q.displayText(text);
    if (className) node.className = className;
    return node;
  };
  function show(id, visible) { $(id).classList.toggle('hidden', !visible); }
  function track(name, params = {}) {
    // No contact details, free text or complete WhatsApp URLs in analytics.
    if (typeof window.gtag === 'function') window.gtag('event',name,params);
  }
  function initAnalytics() {
    // Keep local previews out of the live property's reports.
    if (!/^https?:$/.test(location.protocol) || ['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js',new Date());
    window.gtag('config',D.CONFIG.analyticsId, {allow_google_signals:false,allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(D.CONFIG.analyticsId);
    document.head.appendChild(script);
  }
  function wa(text = '') { return 'https://wa.me/' + D.CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(Q.displayText(text)) : ''); }
  function scrollToNode(node) {
    node.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
  }
  function setOptions(select, items, placeholder, current = '') {
    select.replaceChildren(new Option(placeholder,''));
    items.forEach(([id,label,price]) => select.add(new Option(Q.displayText(label) + (typeof price === 'number' ? ' — ' + money(price) : ''),id)));
    if (items.some(row => row[0] === current)) select.value = current;
  }
  function setDevices() {
    setOptions($('device'), D.devices.filter(d => !category || d[2] === category).map(d => d.slice(0,2)), '-- اختر الجهاز --',state.device);
  }
  function resetDevice(value) {
    Object.assign(state,{device:value,main:'',extras:[],distro:'',mode:''});
    $('additionalServices').replaceChildren();
    $('model').value = ''; $('firmware').value = ''; $('linuxBackup').checked = false; $('moddingOptIn').checked = false;
    $('mainService').value = ''; $('linuxDistro').value = '';
    document.querySelectorAll('[name="linuxMode"]').forEach(r => r.checked = false);
    show('ps4FirmwareBox',value === 'ps4');
    $('firmware').required = value === 'ps4'; $('firmware').disabled = value !== 'ps4';
    invalidatePrepared(); refresh();
  }
  function readState() {
    state.main = $('mainService').value;
    state.extras = [...document.querySelectorAll('.additional-service')].map(s => s.value).filter(Boolean);
    state.distro = $('linuxDistro').value;
    state.mode = document.querySelector('[name="linuxMode"]:checked')?.value || '';
    state.applyPromos = $('applyPromos').checked;
  }
  function refreshServices() {
    // Main service owns the selection. Switching it clears incompatible extras.
    setOptions($('mainService'),Q.availableServices(state.device,[],true), '-- اختر الخدمة الأساسية --',state.main);
    $('mainService').disabled = !state.device;
    state.main = $('mainService').value;
    const selected = state.main ? [state.main] : [];
    const controls = [...document.querySelectorAll('.additional-service')];
    controls.forEach(select => {
      const available = Q.availableServices(state.device, selected, false, state.main === 'linux');
      const old = select.value;
      if (old && !available.some(item => item[0] === old)) select.value = '';
      if (select.value) selected.push(select.value);
    });
    controls.forEach(select => {
      const other = [state.main,...controls.filter(s => s !== select).map(s => s.value)].filter(Boolean);
      setOptions(select,Q.availableServices(state.device,other,false,state.main === 'linux'),'-- اختر خدمة إضافية --',select.value);
    });
    const canAdd = state.main && Q.availableServices(state.device,selected,false,state.main === 'linux').length > 0;
    $('addServiceButton').disabled = !canAdd;
    show('extraBox',Boolean(state.main) && state.main !== 'inspect');
    if (state.main === 'inspect') $('additionalServices').replaceChildren();
    show('extraRequestBox',Boolean(state.device));
    state.extras = [...document.querySelectorAll('.additional-service')].map(s => s.value).filter(Boolean);
  }
  function refreshLinux() {
    const enabled = state.main === 'linux';
    if (!enabled) { state.distro = ''; state.mode = ''; $('linuxDistro').value = ''; }
    const hasDistro = enabled && Boolean(state.distro);
    if (!hasDistro) state.mode = '';
    show('linuxDistroBox',enabled); show('linuxModeBox',hasDistro); show('linuxBackupBox',hasDistro && Boolean(state.mode));
    $('linuxDistro').required = enabled; $('linuxDistro').disabled = !enabled;
    document.querySelectorAll('[name="linuxMode"]').forEach(r => {
      r.required = hasDistro; r.disabled = !hasDistro; r.checked = r.value === state.mode;
    });
    $('linuxBackup').required = hasDistro && Boolean(state.mode);
    $('linuxBackup').disabled = !$('linuxBackup').required;
    if (!$('linuxBackup').required) $('linuxBackup').checked = false;
    show('linuxBitlockerHint', state.mode !== 'wipe');
  }
  function refresh() {
    refreshServices(); refreshLinux(); renderQuote();
  }
  function renderQuote() {
    const quote = Q.calculate(state);
    const required = Boolean(quote?.requiresModding);
    show('moddingSection',required); $('moddingOptIn').required = required; $('moddingOptIn').disabled = !required;
    if (!required) $('moddingOptIn').checked = false;
    $('breakdown').replaceChildren();
    $('quoteDevice').textContent = D.devices.find(d => d[0] === state.device)?.[1] || 'اختار جهازك والخدمة المناسبة';
    $('total').textContent = quote ? money(quote.total) : '—';
    $('mobileQuote').hidden = !quote;
    $('mobileTotal').textContent = quote ? money(quote.total) : '';
    $('quoteContinue').hidden = !quote;
    if (!quote) { $('offerStatus').textContent = 'هنوضح العرض المناسب بعد اختيار الخدمة.'; $('quoteAnnouncement').textContent = ''; return; }
    quote.lines.forEach(line => {
      const row = element('div',undefined,'quote-line');
      row.append(element('span',line.name),element('bdi',money(line.price)));
      $('breakdown').append(row);
    });
    if (quote.discount) {
      const row = element('div',undefined,'quote-line quote-discount');
      row.append(element('span','خصم العرض'),element('bdi','− ' + money(quote.discount)));
      $('breakdown').append(row);
    }
    quote.warnings.forEach(warning => $('breakdown').append(element('p',warning,'hint')));
    $('offerStatus').textContent = quote.offer ? quote.offer.title + ' · يتأكد الاستحقاق على واتساب.' : (state.applyPromos ? 'لا يوجد عرض متاح للخدمات المختارة حاليًا.' : 'السعر بدون تطبيق عروض.');
    $('quoteAnnouncement').textContent = 'الإجمالي التقريبي ' + money(quote.total) + (quote.discount ? '، بعد خصم ' + money(quote.discount) : '');
  }
  function invalidatePrepared() {
    show('successBox',false);
    lastMessage = ''; $('messagePreview').textContent = ''; $('whatsappFallback').href = '#';
    // Keep the last signature/reference: reopening an unchanged request reuses it.
  }
  function addExtra(value = '') {
    const row = element('div',undefined,'service-row');
    const field = element('div',undefined,'extra-field');
    const select = element('select',undefined,'additional-service');
    select.id = 'extra-service-' + (++extraSequence);
    const label = element('label','خدمة إضافية ' + extraSequence); label.htmlFor = select.id;
    const remove = element('button','حذف','remove-service-btn'); remove.type = 'button';
    remove.setAttribute('aria-label','حذف الخدمة الإضافية ' + extraSequence);
    field.append(label,select); row.append(field,remove); $('additionalServices').append(row);
    refreshServices();
    if (value) { select.value = value; readState(); refresh(); }
    select.addEventListener('change',() => { readState(); refresh(); });
    remove.addEventListener('click',() => { row.remove(); readState(); refresh(); invalidatePrepared(); $('addServiceButton').focus(); });
    return select;
  }
  const formatDate = Q.formatOfferDate;
  function renderPromos() {
    campaignDate = Q.cairoDate();
    const active = Q.activePromos();
    const banner = $('promoBannerSlot'), slot = $('promoSectionSlot'); banner.replaceChildren(); slot.replaceChildren();
    if (!active.length) return;
    const strip = element('div',undefined,'promo-banner');
    strip.append(element('span','عروض الرجوع للمدارس · خصومات على خدمات مختارة'));
    const more = element('a','شوف العروض ←'); more.href = '#promoSectionSlot'; strip.append(more); banner.append(strip);
    const section = element('section',undefined,'panel promo-section');
    const heading = element('h2','عرض يناسب جهازك'); heading.id = 'promoHeading'; section.setAttribute('aria-labelledby',heading.id);
    section.append(element('p','عروض لفترة محدودة','eyebrow'),heading);
    const grid = element('div',undefined,'promo-cards');
    active.forEach(p => {
      const card = element('article',undefined,'promo-card');
      card.append(element('h3',p.title),element('p',p.description));
      const price = element('p',undefined,'promo-price');
      if (p.type === 'bundle') {
        const was = p.services.reduce((sum,id) => sum + Q.service(p.device,id).price,0);
        price.append(element('s',money(was)),element('strong',money(p.price)));
      } else price.append(element('strong','خصم ' + p.percentOff + '%'));
      card.append(price,element('p','لحد ' + formatDate(p.endDate),'hint'));
      if (p.note) card.append(element('p',p.note,'hint'));
      if (p.type === 'enquiry') {
        const link = element('a','اسأل عن العرض','button button-outline');
        link.href = wa(p.whatsappText); link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.addEventListener('click',() => track('promo_enquiry',{promo:p.id})); card.append(link);
      } else {
        const button = element('button',p.type === 'bundle' ? 'اختار العرض ده' : 'اختار جهازك واستفيد','button button-outline'); button.type = 'button';
        button.addEventListener('click',() => {
          if (!Q.activePromos().some(item => item.id === p.id)) { renderPromos(); renderQuote(); return; }
          if (p.device) {
            category = D.devices.find(d => d[0] === p.device)[2]; paintCategories(); state.device = p.device; setDevices(); resetDevice(p.device);
          }
          if (!state.device) { scrollToNode($('device')); $('device').focus({preventScroll:true}); return; }
          $('additionalServices').replaceChildren(); state.extras = []; state.main = p.services[0];
          $('applyPromos').checked = true; state.applyPromos = true; refresh();
          p.services.slice(1).forEach(id => addExtra(id)); refresh(); invalidatePrepared();
          scrollToNode($('mainService')); $('mainService').focus({preventScroll:true}); track('promo_select',{promo:p.id});
        }); card.append(button);
      }
      grid.append(card);
    });
    section.append(grid);
    const terms = element('ul',undefined,'promo-terms');
    ['عرض واحد لكل جهاز ورقم موبايل، ولا يُجمع مع عرض تاني. بنأكد الاستحقاق على واتساب.',
      'الخصم على الشغل فقط. القطع المستوردة بسعرها المعتاد، وبتستغرق تقريبًا من 1 إلى 5 أسابيع.',
      'تأكيد العرض وسداد العربون قبل نهاية فترته شرط لتثبيت السعر.'].forEach(t => terms.append(element('li',t)));
    section.append(terms); slot.append(section);
  }
  function paintCategories() {
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.category === category)));
  }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click',() => {
    category = category === button.dataset.category ? '' : button.dataset.category;
    paintCategories(); state.device = ''; setDevices();
    const candidates = D.devices.filter(d => !category || d[2] === category);
    const selected = category && candidates.length === 1 ? candidates[0][0] : '';
    $('device').value = selected; resetDevice(selected); scrollToNode($('device')); $('device').focus({preventScroll:true});
  }));
  $('device').addEventListener('change',() => resetDevice($('device').value));
  $('mainService').addEventListener('change',() => { readState(); refresh(); });
  $('addServiceButton').addEventListener('click',() => addExtra().focus());
  $('linuxDistro').addEventListener('change',() => { readState(); $('linuxBackup').checked = false; refresh(); });
  $('linuxModeBox').addEventListener('change',() => { readState(); $('linuxBackup').checked = false; refresh(); });
  $('applyPromos').addEventListener('change',() => { readState(); renderQuote(); invalidatePrepared(); });
  form.addEventListener('input',event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    event.target.removeAttribute('aria-invalid'); show('formError',false);
    if (event.target.id === 'phone') show('phoneError',false);
    invalidatePrepared();
  });
  form.addEventListener('change',() => invalidatePrepared());
  document.querySelectorAll('input[type="text"],input[type="tel"],textarea').forEach(field => {
    field.addEventListener('blur',() => {
      field.value = Q.displayText(field.value);
      if (field.id === 'phone') field.value = Q.normalizePhone(field.value);
    });
  });
  function validate() {
    $('name').setCustomValidity($('name').value.trim() ? '' : 'اكتب اسمك.');
    $('phone').value = Q.normalizePhone($('phone').value);
    $('phone').setCustomValidity(Q.validPhone($('phone').value) ? '' : 'اكتب رقم موبايل مصري صحيح، زي 01012345678.');
    const invalid = [...form.elements].find(field => field.willValidate && !field.validity.valid);
    for (const field of form.elements) {
      if (field.willValidate) field.setAttribute('aria-invalid',String(!field.validity.valid));
    }
    show('phoneError',!$('phone').validity.valid); show('agreeError',!$('agree').checked);
    show('moddingError',$('moddingOptIn').required && !$('moddingOptIn').checked);
    if (!invalid) { show('formError',false); return true; }
    const label = invalid.labels?.[0]?.textContent.replace(/\s+/g,' ').trim() || 'البيانات المطلوبة';
    $('formError').textContent = 'راجع الحقل: ' + label;
    show('formError',true); invalid.focus(); invalid.reportValidity();
    return false;
  }
  form.addEventListener('submit',event => {
    event.preventDefault();
    readState(); refresh();
    if (!validate()) return;
    const quote = Q.calculate(state);
    if (!quote) return;
    const customer = {name:$('name').value,phone:$('phone').value,model:$('model').value,firmware:$('firmware').value,extraRequest:$('extraRequest').value,notes:$('notes').value};
    const signature = JSON.stringify({state,customer,total:quote.total,offer:quote.offer?.id});
    if (signature !== lastSignature) {
      const random = new Uint32Array(2); crypto.getRandomValues(random);
      lastReference = 'WB-' + Q.cairoDate().replace(/-/g,'') + '-' + [...random].map(n => n.toString(36).toUpperCase()).join('');
      lastSignature = signature;
    }
    lastMessage = Q.message(state,customer,quote,lastReference);
    $('orderRef').textContent = lastReference; $('messagePreview').textContent = lastMessage;
    $('whatsappFallback').href = wa(lastMessage); $('copyStatus').textContent = ''; show('successBox',true);
    $('successBox').focus({preventScroll:true}); scrollToNode($('successBox'));
    // Keep a direct, visible fallback even when a browser blocks the new tab.
    window.open(wa(lastMessage),'_blank','noopener,noreferrer');
    track('whatsapp_handoff',{device:state.device,service:state.main,promo:quote.offer?.id || 'none'});
  });
  $('copyRequest').addEventListener('click',async () => {
    try { await navigator.clipboard.writeText(lastMessage); $('copyStatus').textContent = 'تم نسخ تفاصيل الطلب.'; }
    catch (_) { $('messagePreview').parentElement.open = true; $('copyStatus').textContent = 'النسخ التلقائي غير متاح. تقدر تحدد الرسالة المعروضة وتنسخها يدويًا.'; }
  });
  // Accessible RTL radio group: roving tab stop, arrows, Home and End.
  const stars = [...document.querySelectorAll('#starRating .star')];
  let rating = 0;
  function chooseRating(value, focus = false) {
    rating = value;
    stars.forEach((button,index) => {
      button.setAttribute('aria-checked',String(index + 1 === rating));
      button.tabIndex = index + 1 === (rating || 1) ? 0 : -1;
      button.classList.toggle('filled',index < rating);
    });
    $('rateSelectedLabel').textContent = ['اختر تقييمك','ضعيف','مقبول','جيد','جيد جدًا','ممتاز'][rating];
    show('rateError',false); if (focus) stars[rating - 1].focus();
  }
  stars.forEach((button,index) => {
    button.addEventListener('click',() => chooseRating(index + 1));
    button.addEventListener('keydown',event => {
      let next;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = (index + 1) % 5;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = (index + 4) % 5;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 4;
      if (next !== undefined) { event.preventDefault(); chooseRating(next + 1,true); }
    });
  });
  $('rateSendButton').addEventListener('click',() => {
    if (!rating) { show('rateError',true); stars[0].focus(); return; }
    const message = ['تقييم خدمة - ' + D.CONFIG.name,'التقييم: ' + rating + ' من 5',$('rateComment').value.trim()].filter(Boolean).join('\n');
    window.open(wa(message),'_blank','noopener,noreferrer');
    let fallback = $('ratingFallback');
    if (!fallback) { fallback = element('a','فتح رسالة التقييم على واتساب','rating-fallback'); fallback.id = 'ratingFallback'; fallback.target = '_blank'; fallback.rel = 'noopener noreferrer'; $('rateSendButton').after(fallback); }
    fallback.href = wa(message); track('rating_handoff');
  });
  function checkCampaignDate() {
    if (campaignDate !== Q.cairoDate()) { renderPromos(); renderQuote(); invalidatePrepared(); }
  }
  document.addEventListener('visibilitychange',() => { if (!document.hidden) checkCampaignDate(); });
  window.addEventListener('focus',checkCampaignDate);
  setInterval(checkCampaignDate,60000);
  document.querySelectorAll('[data-inspection-fee]').forEach(node => node.textContent = D.CONFIG.inspectionFee);
  document.querySelectorAll('[data-whatsapp]').forEach(link => {
    link.href = wa('مرحبًا، عندي استفسار عن صيانة جهازي.');
    link.addEventListener('click',() => track('whatsapp_enquiry'));
  });
  document.querySelectorAll('[data-facebook]').forEach(link => link.href = D.CONFIG.facebook);
  document.querySelector('.hero-cta').addEventListener('click',() => track('hero_cta_click'));
  setOptions($('linuxDistro'),D.LINUX_DISTROS.map(([id,label,tier]) => [id,label,D.LINUX_TIERS[tier].price]),'-- اختر التوزيعة --');
  // Keep the full estimate before contact details on small screens.
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const quoteColumn = document.querySelector('.quote-column');
  function placeQuote() {
    if (mobileLayout.matches) $('stepService').after(quoteColumn);
    else document.querySelector('.booking-layout').append(quoteColumn);
  }
  mobileLayout.addEventListener('change',placeQuote);
  placeQuote();
  setDevices(); resetDevice(''); renderPromos(); chooseRating(0); initAnalytics();
})();

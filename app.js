/* One editor, independent device records, one shared customer and order. */
(function() {
  'use strict';
  const D = window.WarshaData, Q = window.WarshaQuote;
  const $ = id => document.getElementById(id);
  const form = $('requestForm'), money = Q.formatMoney;
  let nextUid = 1, extraSequence = 0, lastMessage = '', lastSignature = '', lastReference = '', campaignDate = '';
  const blank = () => ({uid:nextUid++,device:'',main:'',extras:[],distro:'',mode:'',backup:false,model:'',firmware:'',notes:'',extraRequest:'',category:''});
  const items = [blank()];
  let state = items[0];
  const element = (tag,text,className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = Q.bidiText(text);
    if (className) node.className = className;
    return node;
  };
  const show = (id,on) => $(id).classList.toggle('hidden',!on);
  function track(name,params = {}) {
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
  function scrollToNode(node) { node.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}); }
  function setOptions(select,rows,placeholder,current = '') {
    select.dir = 'rtl';
    select.replaceChildren(new Option(placeholder,''));
    rows.forEach(([id,label,price]) => select.add(new Option(Q.optionLabel(label,price),id)));
    if (rows.some(row => row[0] === current)) select.value = current;
  }
  function saveCurrent() {
    state.device = $('device').value; state.main = $('mainService').value;
    state.extras = [...document.querySelectorAll('.additional-service')].map(s => s.value).filter(Boolean);
    state.distro = $('linuxDistro').value;
    state.mode = document.querySelector('[name="linuxMode"]:checked')?.value || '';
    state.backup = $('linuxBackup').checked;
    ['model','firmware','notes','extraRequest'].forEach(key => state[key] = $(key).value);
  }
  function invalidatePrepared() {
    show('successBox',false); lastMessage = ''; $('messagePreview').textContent = ''; $('whatsappFallback').href = '#';
  }
  function newItem(focus = true) {
    state = blank(); items.push(state);
    if (focus) { renderEditor(); invalidatePrepared(); scrollToNode($('activeDeviceLabel')); $('device').focus({preventScroll:true}); }
  }
  function switchItem(uid) {
    saveCurrent(); state = items.find(item => item.uid === uid); renderEditor();
    scrollToNode($('activeDeviceLabel')); $('device').focus({preventScroll:true});
  }
  function removeItem(uid) {
    if (items.length === 1) return;
    saveCurrent(); const index = items.findIndex(item => item.uid === uid);
    items.splice(index,1);
    if (state.uid === uid) state = items[Math.min(index,items.length-1)];
    renderEditor(); invalidatePrepared(); $('addDeviceButton').focus();
  }
  function renderDeviceList(order) {
    $('orderDevices').replaceChildren();
    order.entries.forEach(({state:item,quote,index}) => {
      const li = element('li',undefined,'order-device-row');
      const edit = element('button',undefined,'order-device-button'); edit.type = 'button';
      edit.dataset.deviceUid = item.uid;
      if (item.uid === state.uid) edit.setAttribute('aria-current','true');
      const name = D.devices.find(d => d[0] === item.device)?.[1] || 'جهاز جديد';
      edit.append(element('strong','الجهاز ' + (index+1) + ' — ' + name));
      edit.append(element('small',quote ? money(quote.total) + (Q.deviceIssue(item) ? ' · كمّل التفاصيل' : ' · تعديل الخدمات') : 'اختار الجهاز والخدمة'));
      edit.addEventListener('click',() => switchItem(item.uid));
      const remove = element('button','حذف','remove-device-button'); remove.type = 'button';
      remove.disabled = items.length === 1; remove.setAttribute('aria-label','حذف الجهاز ' + (index+1));
      remove.addEventListener('click',() => removeItem(item.uid));
      li.append(edit,remove); $('orderDevices').append(li);
    });
    const name = D.devices.find(d => d[0] === state.device)?.[1] || 'اختار نوع الجهاز';
    $('activeDeviceLabel').textContent = Q.bidiText('تعديل الجهاز ' + (items.indexOf(state)+1) + ' من ' + items.length + ' — ' + name);
  }
  function mountExtra(value = '') {
    const row = element('div',undefined,'service-row'), field = element('div',undefined,'extra-field');
    const select = element('select',undefined,'additional-service'); select.id = 'extra-service-' + (++extraSequence);
    const label = element('label','خدمة إضافية ' + ($('additionalServices').children.length+1)); label.htmlFor = select.id;
    // Initial options allow restoration; refreshServices then removes conflicts.
    setOptions(select,Q.availableServices(state.device,[],false,state.main === 'linux'),'-- اختر خدمة إضافية --',value);
    const remove = element('button','حذف','remove-service-btn'); remove.type = 'button'; remove.setAttribute('aria-label','حذف ' + label.textContent);
    select.addEventListener('change',() => { saveCurrent(); refresh(); invalidatePrepared(); });
    remove.addEventListener('click',() => { row.remove(); saveCurrent(); refresh(); invalidatePrepared(); $('addServiceButton').focus(); });
    field.append(label,select); row.append(field,remove); $('additionalServices').append(row);
    return select;
  }
  function renderEditor() {
    // No mutation of a different device while rebuilding the active editor.
    setOptions($('device'),D.devices.filter(d => !state.category || d[2] === state.category).map(d => d.slice(0,2)),'-- اختر الجهاز --',state.device);
    setOptions($('mainService'),Q.availableServices(state.device,[],true),'-- اختر الخدمة الأساسية --',state.main);
    ['model','firmware','notes','extraRequest'].forEach(key => $(key).value = state[key]);
    $('linuxDistro').value = state.distro;
    document.querySelectorAll('[name="linuxMode"]').forEach(r => r.checked = r.value === state.mode);
    $('linuxBackup').checked = state.backup;
    $('additionalServices').replaceChildren(); state.extras.forEach(id => mountExtra(id));
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.category === state.category)));
    refresh();
  }
  function refreshServices() {
    setOptions($('mainService'),Q.availableServices(state.device,[],true),'-- اختر الخدمة الأساسية --',state.main);
    $('mainService').disabled = !state.device; state.main = $('mainService').value;
    const selected = state.main ? [state.main] : [];
    const controls = [...document.querySelectorAll('.additional-service')];
    controls.forEach(select => {
      const available = Q.availableServices(state.device,selected,false,state.main === 'linux');
      if (select.value && !available.some(row => row[0] === select.value)) select.value = '';
      if (select.value) selected.push(select.value);
    });
    controls.forEach(select => {
      const other = [state.main,...controls.filter(s => s !== select).map(s => s.value)].filter(Boolean);
      setOptions(select,Q.availableServices(state.device,other,false,state.main === 'linux'),'-- اختر خدمة إضافية --',select.value);
    });
    if (state.main === 'inspect' || !state.main) $('additionalServices').replaceChildren();
    state.extras = [...document.querySelectorAll('.additional-service')].map(s => s.value).filter(Boolean);
    $('addServiceButton').disabled = !state.main || !Q.availableServices(state.device,[state.main,...state.extras],false,state.main === 'linux').length;
    show('extraBox',Boolean(state.main) && state.main !== 'inspect'); show('extraRequestBox',Boolean(state.device));
    show('ps4FirmwareBox',state.device === 'ps4'); $('firmware').required = state.device === 'ps4'; $('firmware').disabled = state.device !== 'ps4';
  }
  function refreshLinux() {
    const on = state.main === 'linux';
    if (!on) { state.distro = ''; state.mode = ''; state.backup = false; }
    if (!state.distro) { state.mode = ''; state.backup = false; }
    const hasDistro = on && Boolean(state.distro), hasMode = hasDistro && Boolean(state.mode);
    show('linuxDistroBox',on); show('linuxModeBox',hasDistro); show('linuxBackupBox',hasMode);
    $('linuxDistro').value = state.distro; $('linuxDistro').required = on; $('linuxDistro').disabled = !on;
    document.querySelectorAll('[name="linuxMode"]').forEach(r => { r.required = hasDistro; r.disabled = !hasDistro; r.checked = r.value === state.mode; });
    if (!hasMode) state.backup = false;
    $('linuxBackup').required = hasMode; $('linuxBackup').disabled = !hasMode; $('linuxBackup').checked = state.backup;
    show('linuxBitlockerHint',state.mode !== 'wipe');
  }
  function refresh() { refreshServices(); refreshLinux(); renderQuote(); }
  function renderQuote() {
    const order = Q.calculateOrder(items,$('applyPromos').checked);
    renderDeviceList(order);
    show('moddingSection',order.requiresModding); $('moddingOptIn').required = order.requiresModding; $('moddingOptIn').disabled = !order.requiresModding;
    if (!order.requiresModding) $('moddingOptIn').checked = false;
    const hasQuote = order.entries.some(e => e.quote);
    $('total').textContent = hasQuote ? money(order.total) : '—';
    $('quoteDevice').textContent = items.length + ' جهاز في الطلب' + (order.pending ? ' · ' + order.pending + ' بدون خدمة مختارة' : '');
    $('mobileQuote').hidden = !hasQuote; $('mobileTotal').textContent = hasQuote ? money(order.total) : '';
    $('quoteContinue').hidden = !hasQuote; $('breakdown').replaceChildren();
    order.entries.forEach(({state:item,quote,index}) => {
      const group = element('section',undefined,'device-quote');
      const name = D.devices.find(d => d[0] === item.device)?.[1] || 'جهاز جديد';
      group.append(element('h3','الجهاز ' + (index+1) + ' — ' + name));
      if (item.model) group.append(element('p','الموديل: ' + item.model,'hint'));
      if (!quote) group.append(element('p','كمّل اختيار الجهاز والخدمة. سعره غير مضاف للإجمالي بعد.','hint quote-pending'));
      else {
        quote.lines.forEach(line => {
          const row = element('div',undefined,'quote-line');
          row.append(element('span',line.name),element('bdi',money(line.price))); group.append(row);
        });
        if (quote.discount) {
          const row = element('div',undefined,'quote-line quote-discount');
          row.append(element('span','خصم العرض'),element('bdi','− ' + money(quote.discount))); group.append(row);
        }
        const subtotal = element('div',undefined,'quote-line device-subtotal');
        subtotal.append(element('strong','إجمالي الجهاز'),element('bdi',money(quote.total))); group.append(subtotal);
        quote.warnings.forEach(w => group.append(element('p',w,'hint')));
      }
      $('breakdown').append(group);
    });
    $('offerStatus').textContent = order.offer ? Q.bidiText(order.offer.title + ' · عرض واحد للطلب، بعد تأكيد الاستحقاق.') : ($('applyPromos').checked ? 'لا يوجد عرض متاح للخدمات المختارة حاليًا.' : 'السعر بدون عروض.');
    $('quoteAnnouncement').textContent = hasQuote ? 'إجمالي ' + items.length + ' جهاز: ' + money(order.total) + (order.pending ? '، أكمل الأجهزة الناقصة.' : '') : '';
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
      const button = element('button',p.type === 'bundle' ? 'أضف العرض للطلب' : p.type === 'second-controller' ? 'أضف أيدي التحكم' : 'اختار جهازك واستفيد','button button-outline');
      button.type = 'button';
      button.addEventListener('click',() => {
        if (!Q.activePromos().some(item => item.id === p.id)) { renderPromos(); renderQuote(); return; }
        saveCurrent();
        if (p.type === 'bundle') {
          // A promotion adds a device instead of overwriting another device's work.
          if (state.device || state.main || state.notes || state.model || state.extraRequest) newItem(false);
          Object.assign(state,{device:p.device,main:p.services[0],extras:p.services.slice(1),category:D.devices.find(d => d[0] === p.device)[2]});
        } else if (p.type === 'second-controller') {
          if (state.device || state.main || state.notes || state.model || state.extraRequest) newItem(false);
          state.category = 'controllers';
        }
        $('applyPromos').checked = true;
        renderEditor(); invalidatePrepared();
        scrollToNode($('activeDeviceLabel')); $('device').focus({preventScroll:true});
        track('promo_select',{promo:p.id});
      });
      card.append(button);
      grid.append(card);
    });
    section.append(grid);
    const terms = element('ul',undefined,'promo-terms');
    ['أفضل عرض واحد لكل الطلب ورقم الموبايل، بدون جمع خصومات. بنأكد الاستحقاق على واتساب.',
      'الخصم على الشغل فقط. القطع المستوردة بسعرها المعتاد، وبتستغرق تقريبًا من 1 إلى 5 أسابيع.',
      'تأكيد العرض وسداد العربون قبل نهاية فترته شرط لتثبيت السعر.'].forEach(t => terms.append(element('li',t)));
    section.append(terms); slot.append(section);
  }

  ['addDeviceButton','addAnotherDeviceButton'].forEach(id => $(id).addEventListener('click',() => { saveCurrent(); newItem(); }));
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click',() => {
    saveCurrent(); const uid = state.uid;
    const category = state.category === button.dataset.category ? '' : button.dataset.category;
    if (state.device && category && !D.devices.some(d => d[0] === state.device && d[2] === category)) Object.assign(state,blank(),{uid});
    state.category = category;
    const candidates = D.devices.filter(d => !category || d[2] === category);
    if (category && candidates.length === 1) state.device = candidates[0][0];
    renderEditor(); invalidatePrepared(); scrollToNode($('activeDeviceLabel')); $('device').focus({preventScroll:true});
  }));
  $('device').addEventListener('change',() => {
    const device = $('device').value, uid = state.uid, category = state.category;
    Object.assign(state,blank(),{uid,category,device}); renderEditor(); invalidatePrepared();
  });
  $('mainService').addEventListener('change',() => { saveCurrent(); refresh(); invalidatePrepared(); });
  $('addServiceButton').addEventListener('click',() => { const select = mountExtra(); refresh(); select.focus(); });
  $('linuxDistro').addEventListener('change',() => { saveCurrent(); state.backup = false; refresh(); invalidatePrepared(); });
  $('linuxModeBox').addEventListener('change',() => { saveCurrent(); state.backup = false; refresh(); invalidatePrepared(); });
  $('linuxBackup').addEventListener('change',() => { saveCurrent(); renderQuote(); invalidatePrepared(); });
  $('applyPromos').addEventListener('change',() => { renderQuote(); invalidatePrepared(); });
  form.addEventListener('input',event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    event.target.removeAttribute('aria-invalid'); show('formError',false);
    if (event.target.id === 'phone') show('phoneError',false);
    saveCurrent(); renderQuote(); invalidatePrepared();
  });
  form.addEventListener('change',invalidatePrepared);
  document.querySelectorAll('input[type="text"],input[type="tel"],textarea').forEach(field => field.addEventListener('blur',() => {
    field.value = Q.displayText(field.value);
    if (field.id === 'phone') field.value = Q.normalizePhone(field.value);
    saveCurrent();
  }));
  function validate() {
    // Validate inactive devices too, then open the exact device that needs work.
    const incomplete = items.find(item => Q.deviceIssue(item));
    if (incomplete) {
      state = incomplete; renderEditor(); const issue = Q.deviceIssue(state);
      $('formError').textContent = 'الجهاز ' + (items.indexOf(state)+1) + ': ' + issue.text;
      show('formError',true);
      const field = issue.field === 'linuxModeBox' ? document.querySelector('[name="linuxMode"]') : $(issue.field);
      field.setAttribute('aria-invalid','true'); field.focus(); scrollToNode(field); return false;
    }
    $('name').setCustomValidity($('name').value.trim() ? '' : 'اكتب اسمك.');
    $('phone').value = Q.normalizePhone($('phone').value);
    $('phone').setCustomValidity(Q.validPhone($('phone').value) ? '' : 'اكتب رقم موبايل مصري صحيح.');
    const invalid = [...form.elements].find(field => field.willValidate && !field.validity.valid);
    for (const field of form.elements) if (field.willValidate) field.setAttribute('aria-invalid',String(!field.validity.valid));
    show('phoneError',!$('phone').validity.valid); show('agreeError',!$('agree').checked);
    show('moddingError',$('moddingOptIn').required && !$('moddingOptIn').checked);
    if (!invalid) { show('formError',false); return true; }
    const label = invalid.labels?.[0]?.textContent.replace(/\s+/g,' ').trim() || 'البيانات المطلوبة';
    $('formError').textContent = 'راجع الحقل: ' + label; show('formError',true); invalid.focus(); invalid.reportValidity(); return false;
  }
  form.addEventListener('submit',event => {
    event.preventDefault(); saveCurrent(); refresh(); if (!validate()) return;
    const order = Q.calculateOrder(items,$('applyPromos').checked);
    const customer = {name:$('name').value,phone:$('phone').value};
    const signature = JSON.stringify({items:items.map(({uid,category,...data}) => data),customer,total:order.total,offer:order.offer?.id});
    if (signature !== lastSignature) {
      const random = new Uint32Array(2); crypto.getRandomValues(random);
      lastReference = 'WB-' + Q.cairoDate().replace(/-/g,'') + '-' + [...random].map(n => n.toString(36).toUpperCase()).join(''); lastSignature = signature;
    }
    lastMessage = Q.orderMessage(items,customer,order,lastReference);
    $('orderRef').textContent = lastReference; $('messagePreview').textContent = lastMessage;
    $('whatsappFallback').href = wa(lastMessage); $('copyStatus').textContent = ''; show('successBox',true);
    $('successBox').focus({preventScroll:true}); scrollToNode($('successBox'));
    window.open(wa(lastMessage),'_blank','noopener,noreferrer');
    track('whatsapp_handoff',{device_count:items.length,promo:order.offer?.id || 'none'});
  });
  $('copyRequest').addEventListener('click',async () => {
    try { await navigator.clipboard.writeText(lastMessage); $('copyStatus').textContent = 'تم نسخ تفاصيل الطلب.'; }
    catch (_) { $('messagePreview').parentElement.open = true; $('copyStatus').textContent = 'النسخ التلقائي غير متاح. تقدر تحدد الرسالة وتنسخها يدويًا.'; }
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
  window.addEventListener('focus',checkCampaignDate); setInterval(checkCampaignDate,60000);
  document.querySelectorAll('[data-inspection-fee]').forEach(node => node.textContent = D.CONFIG.inspectionFee);
  document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = wa('مرحبًا، عندي استفسار عن صيانة أجهزتي.'); link.addEventListener('click',() => track('whatsapp_enquiry')); });
  document.querySelectorAll('[data-facebook]').forEach(link => link.href = D.CONFIG.facebook);
  document.querySelector('.hero-cta').addEventListener('click',() => track('hero_cta_click'));
  setOptions($('linuxDistro'),D.LINUX_DISTROS.map(([id,label,tier]) => [id,label,D.LINUX_TIERS[tier].price]),'-- اختر التوزيعة --');
  const mobileLayout = window.matchMedia('(max-width: 760px)'), quoteColumn = document.querySelector('.quote-column');
  function placeQuote() { if (mobileLayout.matches) $('stepService').after(quoteColumn); else document.querySelector('.booking-layout').append(quoteColumn); }
  mobileLayout.addEventListener('change',placeQuote); placeQuote();
  renderEditor(); renderPromos(); chooseRating(0); initAnalytics();
})();

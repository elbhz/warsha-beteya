/* Shared, side-effect-free pricing and validation. No DOM or network access. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'), require('./promos.js'));
  else root.WarshaQuote = factory(root.WarshaData, root.WarshaPromos);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(D, promos) {
  'use strict';
  // Explicit latn digits: Arabic UI language must never change 0–9 glyphs.
  // Reuse formatters instead of recreating them on every field change.
  const numberFormat = new Intl.NumberFormat('ar-EG', {numberingSystem:'latn', maximumFractionDigits:2});
  const offerDateFormat = new Intl.DateTimeFormat('ar-EG', {numberingSystem:'latn', day:'numeric', month:'long', timeZone:'UTC'});
  const cairoDateFormat = new Intl.DateTimeFormat('en-GB', {numberingSystem:'latn', timeZone:D.CONFIG.timezone, year:'numeric', month:'2-digit', day:'2-digit'});
  function toWesternDigits(value) {
    return String(value).replace(/[٠-٩]/g, n => '٠١٢٣٤٥٦٧٨٩'.indexOf(n))
      .replace(/[۰-۹]/g, n => '۰۱۲۳۴۵۶۷۸۹'.indexOf(n));
  }
  function displayText(value) { return toWesternDigits(value).replace(/و\s*(?=[A-Za-z])/g,'و '); }
  function formatMoney(value) { return numberFormat.format(value) + ' جنيه'; }
  function formatOfferDate(date) { return offerDateFormat.format(new Date(date + 'T12:00:00Z')); }
  function cairoDate(now = new Date()) {
    const parts = cairoDateFormat.formatToParts(now);
    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function activePromos(now = new Date()) {
    const date = cairoDate(now);
    return promos.filter(p => p.active && (!p.startDate || date >= p.startDate) && (!p.endDate || date <= p.endDate));
  }
  function normalizePhone(value) {
    let phone = toWesternDigits(value).replace(/[\s().\-\u200e\u200f\u061c]/g,'');
    if (phone.startsWith('0020')) phone = '0' + phone.slice(4);
    else if (phone.startsWith('+20')) phone = '0' + phone.slice(3);
    else if (/^20\d{10}$/.test(phone)) phone = '0' + phone.slice(2);
    return phone;
  }
  function validPhone(value) { return /^01[0125]\d{8}$/.test(normalizePhone(value)); }
  function service(device, id) {
    const row = (D.services[device] || []).find(s => s[0] === id);
    return row ? {id:row[0], name:row[1], price:row[2]} : null;
  }
  function components(device, id) {
    if (id === 'fullthermal') return device === 'ps3' || device === 'ps4' ? ['clean','thermal','pads'] : ['clean','thermal'];
    return [id];
  }
  function conflict(device, a, b) {
    if (a === b || a === 'inspect' || b === 'inspect') return true;
    return components(device,a).some(id => components(device,b).includes(id));
  }
  function availableServices(device, selected, main = false, linux = false) {
    return (D.services[device] || []).filter(([id]) => {
      if (main && D.LINUX_ADDON_IDS.has(id)) return false;
      if (!main && (id === 'linux' || id === 'inspect' || (!linux && D.LINUX_ADDON_IDS.has(id)))) return false;
      return !selected.some(other => conflict(device,id,other));
    });
  }
  function calculate(state, now = new Date()) {
    const base = service(state.device, state.main);
    if (!base || D.LINUX_ADDON_IDS.has(base.id)) return null;
    const lines = [{...base}];
    const warnings = [];
    if (base.id === 'linux') {
      const distro = D.LINUX_DISTROS.find(d => d[0] === state.distro);
      const tier = D.LINUX_TIERS[distro ? distro[2] : 'std'];
      lines[0].price = tier.price;
      if (distro) lines[0].name = 'تثبيت Linux: ' + distro[1];
      if (state.mode === 'dual') lines.push({id:'dual-boot', name:'تثبيت بجانب النظام الحالي (Dual Boot)',price:D.LINUX_DUAL_BOOT_FEE});
      if (state.mode === 'unsure') warnings.push('لو اتفقنا على Dual Boot، بيضاف ' + D.LINUX_DUAL_BOOT_FEE + ' جنيه.');
    }
    const selected = [base.id];
    for (const id of (state.extras || [])) {
      const extra = service(state.device,id);
      if (!extra || id === 'linux' || id === 'inspect' || (D.LINUX_ADDON_IDS.has(id) && base.id !== 'linux')) continue;
      if (selected.some(previous => conflict(state.device,previous,id))) continue;
      lines.push(extra); selected.push(id);
    }
    const subtotal = lines.reduce((sum, item) => sum + item.price,0);
    let discount = 0, offer = null;
    if (state.applyPromos !== false) {
      for (const p of activePromos(now)) {
        if (p.type === 'enquiry' || (p.device && p.device !== state.device) || !p.services.every(id => selected.includes(id))) continue;
        const eligible = lines.filter(line => p.services.includes(line.id)).reduce((sum,line) => sum + line.price,0);
        const saving = p.type === 'bundle' ? Math.max(0,eligible-p.price) : eligible * p.percentOff / 100;
        if (saving > discount) { discount = saving; offer = p; }
      }
    }
    discount = Math.round(discount * 100) / 100;
    return {lines,subtotal,discount,total:Math.round((subtotal-discount)*100)/100,offer,warnings,
      requiresModding:selected.some(id => D.moddingServices.has(id))};
  }
  function message(state, customer, quote, reference) {
    if (!quote) throw new Error('A quote is required');
    const device = D.devices.find(d => d[0] === state.device);
    return displayText([
      'طلب صيانة - ' + D.CONFIG.name, 'مرجع الطلب: ' + reference, '--------------------------------',
      'الاسم: ' + customer.name.trim(), 'واتساب: ' + normalizePhone(customer.phone),
      'الجهاز: ' + device[1], 'رقم الموديل: ' + (customer.model.trim() || 'لا أعرف'),
      state.device === 'ps4' ? 'إصدار نظام PS4: ' + customer.firmware : '',
      ...quote.lines.map(line => line.name + ': ' + line.price + ' جنيه'),
      state.main === 'linux' ? 'طريقة التثبيت: ' + D.LINUX_MODES[state.mode] : '',
      state.main === 'linux' ? 'تأكيد النسخة الاحتياطية: نعم' : '',
      customer.extraRequest.trim() ? 'طلب للاستفسار: ' + customer.extraRequest.trim() : '',
      customer.notes.trim() ? 'ملاحظات: ' + customer.notes.trim() : '',
      quote.offer ? 'العرض: ' + quote.offer.title + ' [' + quote.offer.id + ']' : '',
      quote.discount ? 'قبل الخصم: ' + quote.subtotal + ' جنيه / الخصم: ' + quote.discount + ' جنيه' : '',
      'الإجمالي التقريبي: ' + quote.total + ' جنيه (لا يشمل قطع الغيار أو الشحن أو الجمارك)',
      ...quote.warnings, 'رسوم الفحص: ' + D.CONFIG.inspectionFee + ' جنيه، محسوبة ضمن سعر الخدمة عند التنفيذ.',
      quote.requiresModding ? 'تمت الموافقة الصريحة على شروط خدمات التعديل.' : '',
      quote.offer ? 'عرض واحد لكل جهاز ورقم موبايل، وتأكيد الأهلية والعربون قبل انتهاء العرض على واتساب.' : '',
      'أوافق على بنود الخدمة وسياسة الدفع والاسترداد.',
      'ورشة من المنزل في القاهرة. الاستلام والتسليم بالاتفاق.',
      'سأرسل صور الجهاز والموديل إن أمكن.'
    ].filter(Boolean).join('\n'));
  }
  return {toWesternDigits,displayText,formatMoney,formatOfferDate,cairoDate,activePromos,normalizePhone,validPhone,service,components,conflict,availableServices,calculate,message};
});

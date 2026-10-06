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
  function displayText(value) { return toWesternDigits(value).replace(/و[ \t]*(?=[A-Za-z])/g,'و '); }
  // Native <option> elements cannot contain <bdi>. Unicode isolates are the
  // equivalent: each Latin run, service label and price is a separate unit.
  const LRI = '\u2066', RLI = '\u2067', PDI = '\u2069';
  function bidiText(value) {
    return displayText(value).replace(/[\u2066-\u2069]/g,'').replace(
      /[A-Za-z0-9]+(?:[ \t]+[A-Za-z0-9]+|[ \t]*[\/+.,_-][ \t]*[A-Za-z0-9]+)*/g,
      run => LRI + run + PDI
    );
  }
  function optionLabel(label, price) {
    const name = RLI + bidiText(label) + PDI;
    return name + (typeof price === 'number' ? ' — ' + RLI + 'السعر: ' + LRI + numberFormat.format(price) + PDI + ' جنيه' + PDI : '');
  }
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
        if (!['bundle','percent'].includes(p.type) || (p.device && p.device !== state.device) || !p.services.every(id => selected.includes(id))) continue;
        const eligible = lines.filter(line => p.services.includes(line.id)).reduce((sum,line) => sum + line.price,0);
        const saving = p.type === 'bundle' ? Math.max(0,eligible-p.price) : eligible * p.percentOff / 100;
        if (saving > discount) { discount = saving; offer = p; }
      }
    }
    discount = Math.round(discount * 100) / 100;
    return {lines,subtotal,discount,total:Math.round((subtotal-discount)*100)/100,offer,warnings,
      requiresModding:selected.some(id => D.moddingServices.has(id))};
  }
  function deviceIssue(state) {
    if (!D.devices.some(d => d[0] === state.device)) return {field:'device',text:'اختار نوع الجهاز.'};
    if (!service(state.device,state.main) || D.LINUX_ADDON_IDS.has(state.main)) return {field:'mainService',text:'اختار الخدمة الأساسية.'};
    if (state.device === 'ps4' && !state.firmware) return {field:'firmware',text:'اختار إصدار نظام PS4 أو «لا أعرف».'};
    if (state.main === 'linux') {
      if (!D.LINUX_DISTROS.some(d => d[0] === state.distro)) return {field:'linuxDistro',text:'اختار توزيعة Linux.'};
      if (!Object.hasOwn(D.LINUX_MODES,state.mode)) return {field:'linuxModeBox',text:'اختار طريقة تثبيت Linux.'};
      if (!state.backup) return {field:'linuxBackup',text:'أكد النسخة الاحتياطية للجهاز ده قبل المتابعة.'};
    }
    return null;
  }
  function calculateOrder(states, applyPromos = true, now = new Date()) {
    const entries = states.map((state,index) => ({index,state,quote:calculate({...state,applyPromos:false},now)}));
    let saving = 0, chosen = null, target = -1;
    if (applyPromos) {
      entries.forEach(entry => {
        const candidate = calculate({...entry.state,applyPromos:true},now);
        if (candidate && candidate.discount > saving) {
          saving = candidate.discount; chosen = candidate.offer; target = entry.index;
        }
      });
      // One physical device per entry. Only the second controller receiving
      // repair work qualifies; cleaning or standalone inspection is not repair.
      const controllerOffer = activePromos(now).find(p => p.type === 'second-controller');
      if (controllerOffer) {
        const eligible = entries.filter(entry => controllerOffer.devices.includes(entry.state.device) && entry.quote &&
          entry.quote.lines.some(line => controllerOffer.services.includes(line.id)));
        if (eligible.length >= 2) {
          const second = eligible[1];
          const labour = second.quote.lines.filter(line => controllerOffer.services.includes(line.id)).reduce((sum,line) => sum+line.price,0);
          const discount = Math.round(labour * controllerOffer.percentOff) / 100;
          if (discount > saving) { saving = discount; chosen = controllerOffer; target = second.index; }
        }
      }
    }
    if (target >= 0) {
      const quote = entries[target].quote;
      quote.discount = saving; quote.offer = chosen; quote.total = Math.round((quote.subtotal-saving)*100)/100;
    }
    const subtotal = entries.reduce((sum,e) => sum + (e.quote?.subtotal || 0),0);
    return {entries,subtotal,discount:saving,total:Math.round((subtotal-saving)*100)/100,offer:chosen,
      pending:entries.filter(e => !e.quote).length,
      requiresModding:entries.some(e => e.quote?.requiresModding)};
  }
  function orderMessage(states, customer, order, reference) {
    if (!states.length || order.pending || states.some(deviceIssue)) throw new Error('Complete every device before preparing an order');
    const lines = ['طلب صيانة - ' + D.CONFIG.name,'مرجع الطلب: ' + reference,
      'الاسم: ' + customer.name.trim(),'واتساب: ' + normalizePhone(customer.phone),
      'عدد الأجهزة: ' + states.length];
    order.entries.forEach(({state,quote,index}) => {
      lines.push('--------------------------------','الجهاز ' + (index+1) + ': ' + D.devices.find(d => d[0] === state.device)[1],
        'رقم الموديل: ' + (state.model?.trim() || 'لا أعرف'));
      if (state.device === 'ps4') lines.push('إصدار النظام: ' + state.firmware);
      quote.lines.forEach(line => lines.push('• ' + line.name,'  السعر: ' + line.price + ' جنيه'));
      if (state.main === 'linux') lines.push('طريقة التثبيت: ' + D.LINUX_MODES[state.mode],'تأكيد النسخة الاحتياطية لهذا الجهاز: نعم');
      if (state.notes?.trim()) lines.push('ملاحظات الجهاز: ' + state.notes.trim());
      if (state.extraRequest?.trim()) lines.push('طلب للاستفسار: ' + state.extraRequest.trim());
      if (quote.offer) lines.push('العرض: ' + quote.offer.title + ' [' + quote.offer.id + ']','خصم الجهاز: ' + quote.discount + ' جنيه');
      lines.push('إجمالي الجهاز ' + (index+1) + ': ' + quote.total + ' جنيه',...quote.warnings);
    });
    lines.push('--------------------------------','الإجمالي قبل الخصم: ' + order.subtotal + ' جنيه',
      'إجمالي الخصم: ' + order.discount + ' جنيه','إجمالي الطلب التقريبي: ' + order.total + ' جنيه',
      'الأسعار لا تشمل قطع الغيار أو الشحن أو الجمارك.',
      'رسوم الفحص: ' + D.CONFIG.inspectionFee + ' جنيه لكل جهاز، محسوبة ضمن خدمته عند التنفيذ.',
      order.offer ? 'عرض واحد للطلب، مع تأكيد الاستحقاق والعربون قبل انتهاء العرض على واتساب.' : '',
      order.requiresModding ? 'تمت الموافقة الصريحة على شروط التعديل لكل الأجهزة المختارة التي تتطلبه.' : '',
      'أوافق على بنود الخدمة وسياسة الدفع والاسترداد.','ورشة من المنزل في القاهرة. الاستلام والتسليم بالاتفاق.',
      'سأرسل صور كل جهاز وموديله إن أمكن.');
    return displayText(lines.filter(Boolean).join('\n'));
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
  return {bidiText,optionLabel,deviceIssue,calculateOrder,orderMessage,toWesternDigits,displayText,formatMoney,formatOfferDate,cairoDate,activePromos,normalizePhone,validPhone,service,components,conflict,availableServices,calculate,message};
});

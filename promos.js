/* Edit campaigns here. active:false disables one offer.
 * Dates are inclusive in Africa/Cairo. One offer per request; no stacking.
 * Enquiry-only offers stay outside the automatic quote calculation. */
(function(root, factory) {
  const promos = factory();
  if (typeof module === 'object' && module.exports) module.exports = promos;
  else root.WarshaPromos = promos;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const dates = { active: true, startDate: '2026-09-15', endDate: '2026-10-12' };
  return [
    { ...dates, id:'macbook-full', title:'كومبو الماك بوك — تنظيف كامل',
      description:'OCLP + تنظيف وتغيير معجون حراري', device:'mac-intel',
      services:['oclp','fullthermal'], price:1300, type:'bundle' },
    { ...dates, id:'macbook-clean', title:'كومبو الماك بوك — تنظيف',
      description:'OCLP + تنظيف داخلي وخارجي', device:'mac-intel',
      services:['oclp','clean'], price:1150, type:'bundle' },
    { ...dates, id:'playstation-back-to-school', title:'كومبو تعديل البلايستيشن',
      description:'PS4: إعداد GoldHEN + تنظيف ومعجون وبادات، بعد تأكيد التوافق.', device:'ps4',
      services:['(jailbreak) goldhen','fullthermal'], price:990, type:'bundle',
      note:'الكومبو متاح لـ PS3 بسعر يتأكد على واتساب. التعديل للاستخدام الشخصي مع الألعاب التي تملكها قانونيًا.' },
    { ...dates, id:'starter-clean-inspect', title:'عرض البداية',
      description:'خصم على التنظيف والفحص المبدئي، والفحص محسوب ضمن الخدمة.',
      services:['clean'], percentOff:25, type:'percent',
      note:'الخصم على بند التنظيف فقط. الفحص داخل سعر الخدمة، من غير رسوم فحص إضافية.' },
    { ...dates, id:'second-controller', title:'خصم اليد الثانية',
      description:'خصم 20% على إصلاح اليد الثانية في نفس الطلب (DualShock 2 / 3 / 4).',
      type:'second-controller', percentOff:20, devices:['ds2','ds3','ds4'],
      services:['drift','buttons','battery','charge'],
      note:'أضف كل يد كجهاز مستقل. الخصم على شغل إصلاح اليد الثانية، وأفضل عرض واحد يُطبق على الطلب.',
      whatsappText:'مرحبًا، عندي أكتر من يد تحكم وعايز أستفيد من خصم اليد الثانية.' }
  ];
});

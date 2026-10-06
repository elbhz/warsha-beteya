/* Business settings and service prices. Amounts are EGP, labour only.
 * Inspection is credited toward completed work, never added on top.
 * This file works directly in a browser and in the Node test runner. */
(function(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.WarshaData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const CONFIG = Object.freeze({
    name: 'ورشة بيتية', whatsapp: '201277048080', inspectionFee: 150,
    linuxDualBootFee: 150, timezone: 'Africa/Cairo',
    siteUrl: 'https://elbhz.github.io/warsha-beteya/',
    facebook: 'https://www.facebook.com/profile.php?id=61593335382482',
    analyticsId: 'G-90SYVXP2KQ'
  });
  const services = {
      ps1: [ ['clean','تنظيف عميق',150], ['disc','صيانة قارئ/درج الأقراص',300], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ps2: [ ['clean','تنظيف عميق',150], ['thermal','تغيير معجون حراري',200], ['disc','صيانة قارئ/درج الأقراص',300], ['opl','إعداد و تعديل (Jailbreak) OPL / FreeMcBoot / Fortuna',400], ['brick','إصلاح تعليق الشاشة/Software Brick',400], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ps3: [ ['clean','تنظيف عميق',200], ['thermal','تغيير معجون حراري',250], ['pads','تغيير بادات حرارية',300], ['fullthermal','تنظيف + معجون + بادات',600], ['disc','صيانة قارئ/درج الأقراص',350], ['hen','إعداد و تعديل (Jailbreak) CFW / HEN',450], ['setup','إعداد وترتيب البرامج والألعاب',150], ['brick','إصلاح تعليق الشاشة/Software Brick',450], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ps4: [ ['clean','تنظيف عميق',250], ['thermal','تغيير معجون حراري',300], ['pads','تغيير بادات حرارية',350], ['fullthermal','تنظيف + معجون + بادات',700], ['disc','صيانة قارئ/درج الأقراص',400], ['(jailbreak) goldhen','إعداد (jailbreak) GoldHEN (بعد تأكيد التوافق)',500], ['setup','إعداد وترتيب البرامج والألعاب',150], ['storage','تركيب/تهيئة HDD أو SSD',250], ['brick','إصلاح تعليق الشاشة/Software Brick',500], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      psp: [ ['clean','تنظيف عميق',120], ['battery','تغيير بطارية (القطعة منفصلة)',150], ['screen','تغيير شاشة (القطعة منفصلة)',200], ['buttons','صيانة أزرار/Analog',180], ['cfw','إعداد و تعديل (Jailbreak) CFW / ARK',350], ['setup','إعداد وترتيب البرامج والألعاب',120], ['brick','إصلاح تعليق الشاشة/Software Brick',350], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      vita: [ ['clean','تنظيف عميق',150], ['battery','تغيير بطارية (القطعة منفصلة)',180], ['screen','تغيير شاشة (القطعة منفصلة)',250], ['buttons','صيانة أزرار/Analog',200], ['cfw','إعداد و تعديل (Jailbreak) CFW',400], ['setup','إعداد وترتيب البرامج والألعاب',150], ['brick','إصلاح تعليق الشاشة/Software Brick',400], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ds2: [ ['clean','تنظيف عميق',100], ['drift','صيانة Analog / حل الانحراف',180], ['buttons','صيانة أزرار',150], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ds3: [ ['clean','تنظيف عميق',120], ['drift','صيانة Analog / حل الانحراف',200], ['buttons','صيانة أزرار',160], ['battery','تغيير بطارية (القطعة منفصلة)',120], ['charge','صيانة منفذ الشحن',180], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      ds4: [ ['clean','تنظيف عميق',130], ['drift','صيانة Analog / حل الانحراف',220], ['buttons','صيانة أزرار',180], ['battery','تغيير بطارية (القطعة منفصلة)',140], ['charge','صيانة منفذ الشحن',200], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      'mac-intel': [ ['clean','تنظيف داخلي وخارجي',250], ['thermal','تغيير معجون حراري',350], ['fullthermal','تنظيف + معجون حراري',500], ['macos','تثبيت macOS',300], ['oclp','OCLP (Jailbreak): تثبيت وتحسين macOS',1000], ['linux','تثبيت نظام Linux',350], ['storage','تركيب/تهيئة SSD (القطعة منفصلة)',300], ['battery','تغيير بطارية (القطعة منفصلة)',250], ['brick','إصلاح مشاكل الإقلاع/Software Brick',400], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      'mac-silicon': [ ['clean','تنظيف خارجي وفحص مبدئي',200], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ],
      'pc-laptop': [ ['clean','تنظيف داخلي وخارجي',250], ['thermal','تغيير معجون حراري',300], ['fullthermal','تنظيف + معجون حراري',500], ['linux','تثبيت نظام Linux',350], ['inspect','فحص مبدئي',CONFIG.inspectionFee] ]
    };
    const LINUX_TIERS = {
      std:   { label:'مناسبة للمبتدئين',                  price:350 },
      light: { label:'خفيفة للأجهزة القديمة والبطيئة',    price:400 },
      adv:   { label:'متقدمة (سعر ثابت يتحدد مسبقًا)',    price:800 }
    };
    const LINUX_DUAL_BOOT_FEE = CONFIG.linuxDualBootFee;
    const LINUX_DISTROS = [ // [id, الاسم, الفئة]
      ['auto','مش عارف، اختار لي الأنسب','std'],
      ['ubuntu','Ubuntu','std'], ['mint','Linux Mint','std'], ['fedora','Fedora','std'],
      ['debian','Debian','std'], ['zorin','Zorin OS','std'], ['popos','Pop!_OS','std'],
      ['lubuntu','Lubuntu','light'], ['xubuntu','Xubuntu','light'], ['mint-xfce','Linux Mint XFCE','light'], ['lite','Linux Lite','light'],
      ['arch','Arch Linux','adv'], ['nixos','NixOS','adv'], ['custom','إعداد مخصص (اكتب التفاصيل في الملاحظات)','adv'],
      ['other','توزيعة أخرى (اكتبها في الملاحظات)','std']
    ];
    const LINUX_MODES = { wipe:'مسح كامل للهارد', dual:'بجانب النظام الحالي (Dual Boot)', unsure:'مش متأكد - اختار لي' };
    const LINUX_ADDONS = [
      ['lx-wine','إضافة Linux: Wine / Bottles لتشغيل برامج Windows',100],
      ['lx-printer','إضافة Linux: إعداد الطابعة',100],
      ['lx-dev','إضافة Linux: بيئة تطوير (Dev Environment)',100]
    ];
    const LINUX_ADDON_IDS = new Set(LINUX_ADDONS.map(a => a[0]));
    ['mac-intel','pc-laptop'].forEach(k => services[k].push(...LINUX_ADDONS));


  const devices = [
    ['ps1','PlayStation 1 (PS1)','playstation'], ['ps2','PlayStation 2 (PS2)','playstation'],
    ['ps3','PlayStation 3 (PS3)','playstation'], ['ps4','PlayStation 4 (PS4)','playstation'],
    ['psp','PlayStation Portable (PSP)','playstation'], ['vita','PlayStation Vita','playstation'],
    ['ds2','يد DualShock 2','controllers'], ['ds3','يد DualShock 3','controllers'], ['ds4','يد DualShock 4','controllers'],
    ['mac-intel','MacBook Intel','mac'], ['mac-silicon','MacBook Apple Silicon','mac'],
    ['pc-laptop','PC / Laptop','pc']
  ];
  const moddingServices = new Set(['hen','cfw','(jailbreak) goldhen','oclp','oclp_full','jailbreak','setup','opl','brick']);
  return { CONFIG, services, devices, moddingServices, LINUX_TIERS, LINUX_DISTROS,
    LINUX_MODES, LINUX_ADDONS, LINUX_ADDON_IDS, LINUX_DUAL_BOOT_FEE };
});

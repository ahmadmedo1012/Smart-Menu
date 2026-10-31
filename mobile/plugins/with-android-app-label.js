/**
 * P36 (بناء iOS): أدوات بناء SDK 58 الجديدة تقرأ entitlements عبر اسم
 * scheme مشتق من «name» — والاسم العربي «الربط الذكي | Smart Menu» كان
 * يُعقَّم إلى «alrbtalthkySmartMenu» بينما تتوقع الأدوات «SmartMenu»،
 * فيموت البناء بـ «scheme does not exist». الحل القانوني: اسم مشروع
 * ASCII («Smart Menu») + CFBundleDisplayName للعرض على iOS — لكن تسمية
 * مشغّل أندرويد تُستمد هي الأخرى من «name»، وهذا المكوّن يعيد الاسم
 * العربي الكامل إلى strings.xml (نفس نمط with-force-rtl: تعديل ما
 * يولّده prebuild دون لمس CNG نفسه).
 */
const { withStringsXml } = require('@expo/config-plugins');

const APP_LABEL = 'الربط الذكي | Smart Menu';

function withAndroidAppLabel(config) {
  return withStringsXml(config, (cfg) => {
    const strings = cfg.modResults;
    let app = strings.resources.string?.find(
      (s) => s.$.name === 'app_name'
    );
    if (app) {
      app._ = APP_LABEL;
    } else {
      if (!strings.resources.string) strings.resources.string = [];
      strings.resources.string.push({ $: { name: 'app_name' }, _: APP_LABEL });
    }
    return cfg;
  });
}

module.exports = withAndroidAppLabel;

// r96-W2: تحويل صور الديمو الخام إلى webp مضغوط بأحجام مناسبة للبطاقات
// - أصناف المنيو: 800×600 (نسبة 4:3 مطابقة لبطاقة MenuItemCard، أعلى كثافة عرض 576px)
// - الشعار: 400×400
// - الأغلفة: 1200×675 (16:9)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'scripts/r96-imgs-tmp';
const OUT = 'public/demo';

const ITEMS = [
  'espresso', 'cappuccino', 'caramel-latte', 'turkish-coffee', 'mint-tea', 'hot-chocolate',
  'iced-coffee', 'mint-lemonade', 'mango-smoothie', 'mojito', 'orange-juice',
  'cheese-kunafa', 'cheesecake', 'chocolate-cake', 'nutella-crepe', 'basbousa',
  'oasis-burger', 'tuna-sandwich', 'fries', 'caesar-salad', 'chicken-shawarma',
  'oasis-breakfast', 'butter-croissant', 'avocado-toast', 'honey-pancakes',
];
const COVERS = ['cover-interior', 'cover-barista'];

async function convert(name, w, h, quality) {
  const src = path.join(SRC, `${name}.png`);
  const dst = path.join(OUT, `${name}.webp`);
  const before = fs.statSync(src).size;
  await sharp(src).resize(w, h, { fit: 'cover' }).webp({ quality, effort: 5 }).toFile(dst);
  const after = fs.statSync(dst).size;
  console.log(`${name}.webp ${w}x${h}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
}

fs.mkdirSync(OUT, { recursive: true });

for (const item of ITEMS) await convert(item, 800, 600, 78);
for (const cover of COVERS) await convert(cover, 1200, 675, 76);
await convert('logo', 400, 400, 82);

const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.webp'))
  .reduce((acc, f) => acc + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`─── TOTAL: ${fs.readdirSync(OUT).length} webp files, ${(total / 1024).toFixed(0)}KB`);

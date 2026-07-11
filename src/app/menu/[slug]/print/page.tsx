import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { toArabicNumber } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "طباعة المنيو",
};

export default async function PrintMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: { id: true, name: true, logo: true, description: true, phone: true, workingHours: true } });
  if (!restaurant) notFound();

  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true, restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { status: "available" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const totalItems = categories.reduce((a, c) => a + c.items.length, 0);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <title>{`${restaurant.name} - المنيو | للطباعة`}</title>
        <style>{`
          :root {
            --print-foreground: oklch(0.2 0.02 85);
            --print-background: oklch(1 0 0);
            --print-primary: oklch(0.62 0.18 50);
            --print-amber-500: oklch(0.72 0.14 65);
            --print-amber-700: oklch(0.55 0.12 55);
            --print-muted: oklch(0.78 0.02 75);
            --print-border: oklch(0.85 0.03 70);
            --print-sub: oklch(0.5 0.025 70);
            --print-desc: oklch(0.6 0.02 70);
            --print-footer: oklch(0.65 0.02 70);
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Traditional Arabic', 'Noto Naskh Arabic', serif;
            color: var(--print-foreground); background: var(--print-background);
            line-height: 1.6; padding: 1.5cm;
          }
          h1 { font-size: 1.8rem; color: var(--print-primary); text-align: center; }
          .sub { text-align: center; color: var(--print-sub); font-size: 0.85rem; margin: 0.3rem 0; }
          .divider { border: none; border-top: 2px solid var(--print-amber-500); margin: 1rem 0; }
          .cat { margin: 1.2rem 0; page-break-inside: avoid; }
          .cat h2 { font-size: 1.1rem; color: var(--print-amber-700); border-bottom: 1px solid var(--print-border); padding-bottom: 0.3rem; }
          .item { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.95rem; }
          .item .nm { font-weight: 500; }
          .item .pr { font-weight: 700; color: var(--print-primary); white-space: nowrap; }
          .item .old { text-decoration: line-through; color: var(--print-muted); font-weight: 400; }
          .desc { font-size: 0.8rem; color: var(--print-desc); }
          .footer { text-align: center; font-size: 0.75rem; color: var(--print-footer); border-top: 1px solid var(--print-border); padding-top: 1rem; margin-top: 2rem; }
          .actions { text-align: center; margin-bottom: 1rem; }
          .actions a, .actions button { color: var(--print-amber-500); font-size: 0.85rem; margin: 0 0.5rem; cursor: pointer; background: none; border: none; text-decoration: underline; }
          .print-btn { background: var(--print-amber-500); color: var(--print-background) !important; text-decoration: none !important; padding: 8px 24px; border-radius: 8px; display: inline-block; margin-top: 0.5rem; font-size: 1rem !important; }
          @media print { .actions { display: none; } body { padding: 0; } @page { margin: 1.5cm; } }
        `}</style>
      </head>
      <body>
        <div className="actions">
          <a href={`/menu/${slug}`}>← العودة للمنيو الرقمي</a>
        </div>

        <h1>{restaurant.name}</h1>
        {restaurant.description && <p className="sub">{restaurant.description}</p>}
        <p className="sub">
          {restaurant.phone && <> 📞 {restaurant.phone}  </>}
          {restaurant.workingHours && <>  🕐 {restaurant.workingHours}</>}
        </p>
        <p className="sub" style={{fontSize:"0.8rem",color:"var(--print-footer)"}}>
          {toArabicNumber(categories.length)} قسم · {toArabicNumber(totalItems)} صنف
        </p>
        <hr className="divider" />

        {categories.map(cat => (
          <div key={cat.id} className="cat">
            <h2>{cat.nameAr || cat.name}</h2>
            {cat.items.length === 0 ? (
              <p style={{color:"var(--print-footer)",fontSize:"0.85rem"}}>لا توجد أصناف</p>
            ) : (
              cat.items.map(item => (
                <div key={item.id}>
                  <div className="item">
                    <span className="nm">{item.nameAr || item.name}</span>
                    <span className="pr">
                      {item.discountedPrice ? (
                        <><span className="old">{toArabicNumber(Number(item.price).toFixed(1))}</span> {toArabicNumber(Number(item.discountedPrice).toFixed(1))}</>
                      ) : (
                        toArabicNumber(Number(item.price).toFixed(1))
                      )} د.ل
                    </span>
                  </div>
                  {(item.descriptionAr || item.description) && (
                    <p className="desc">{item.descriptionAr || item.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        ))}

        <div className="footer">
          <p>مدعوم من <strong>الربط الذكي</strong></p>
        </div>

        <div className="actions" style={{marginTop:"1rem"}}>
          <button onClick={() => window.print()} className="print-btn">🖨️ حفظ كـ PDF / طباعة</button>
        </div>
      </body>
    </html>
  );
}

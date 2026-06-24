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

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Traditional Arabic', 'Noto Naskh Arabic', serif;
            color: #1a1a1a; background: #fff;
            line-height: 1.6; padding: 1.5cm;
          }
          h1 { font-size: 1.8rem; color: #b45309; text-align: center; }
          .sub { text-align: center; color: #666; font-size: 0.85rem; margin: 0.3rem 0; }
          .divider { border: none; border-top: 2px solid #d97706; margin: 1rem 0; }
          .cat { margin: 1.2rem 0; page-break-inside: avoid; }
          .cat h2 { font-size: 1.1rem; color: #92400e; border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; }
          .item { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.95rem; }
          .item .nm { font-weight: 500; }
          .item .pr { font-weight: 700; color: #b45309; white-space: nowrap; }
          .item .old { text-decoration: line-through; color: #ccc; font-weight: 400; }
          .desc { font-size: 0.8rem; color: #888; }
          .footer { text-align: center; font-size: 0.75rem; color: #999; border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 2rem; }
          .actions { text-align: center; margin-bottom: 1rem; }
          .actions a, .actions button { color: #d97706; font-size: 0.85rem; margin: 0 0.5rem; cursor: pointer; background: none; border: none; text-decoration: underline; }
          .print-btn { background: #d97706; color: #fff !important; text-decoration: none !important; padding: 8px 24px; border-radius: 8px; display: inline-block; margin-top: 0.5rem; font-size: 1rem !important; }
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
        <p className="sub" style={{fontSize:"0.8rem",color:"#999"}}>
          {toArabicNumber(categories.length)} قسم · {toArabicNumber(totalItems)} صنف
        </p>
        <hr className="divider" />

        {categories.map(cat => (
          <div key={cat.id} className="cat">
            <h2>{cat.nameAr || cat.name}</h2>
            {cat.items.length === 0 ? (
              <p style={{color:"#999",fontSize:"0.85rem"}}>لا توجد أصناف</p>
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
          <a href="javascript:window.print()" className="print-btn">🖨️ حفظ كـ PDF / طباعة</a>
        </div>
      </body>
    </html>
  );
}

#!/usr/bin/env node
/**
 * Round79 Stage H — seed featured items for the local test menu
 * (al-waha-cafe) so the FeaturedShowcase section renders for the
 * screenshot/GIF/axe gates. Idempotent: re-running refreshes the same values.
 */
import pg from 'pg';

const { Client } = pg;
const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartmenu';

const client = new Client({ connectionString: url });
try {
	await client.connect();

	// 3 best candidates: available items WITH images, ordered by id for stability
	const { rows } = await client.query(
		`SELECT m.id, m.name, m."nameAr", (m.image <> '') AS has_image
		 FROM "MenuItem" m
		 JOIN "MenuCategory" c ON c.id = m."categoryId"
		 JOIN "Restaurant" r ON r.id = c."restaurantId"
		 WHERE r.slug = 'al-waha-cafe' AND m.status = 'available'
		 ORDER BY (m.image <> '') DESC, m.id ASC
		 LIMIT 3`
	);
	if (rows.length < 3) throw new Error(`expected 3 items, found ${rows.length}`);

	const tags = ['مقرمش', 'الأكثر طلبًا', 'حصري'];
	let i = 0;
	for (const item of rows) {
		await client.query(
			`UPDATE "MenuItem" SET "isFeatured" = true, "featuredRank" = $1, "showcaseTag" = $2 WHERE id = $3`,
			[++i, tags[i - 1], item.id]
		);
		console.log(`featured #${i}: [${item.id}] ${item.nameAr || item.name} — badge "${tags[i - 1]}" (image: ${item.has_image})`);
	}

	// proof query
	const proof = await client.query(
		`SELECT id, name, "isFeatured", "featuredRank", "showcaseTag" FROM "MenuItem" WHERE "isFeatured" = true ORDER BY "featuredRank"`
	);
	console.log('--- DB proof ---');
	console.table(proof.rows);
} finally {
	await client.end();
}

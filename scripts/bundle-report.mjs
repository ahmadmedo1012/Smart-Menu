#!/usr/bin/env node
/**
 * scripts/bundle-report.mjs — round88-A1
 *
 * Zero-dependency bundle size report for the client JS chunks Next emits
 * into `.next/static/chunks/`. Prints a table (file · raw · gzip) sorted by
 * gzip size, flags chunks that carry the framer-motion engine, and totals.
 *
 * Usage:
 *   node scripts/bundle-report.mjs                        # table to stdout
 *   node scripts/bundle-report.mjs --json out.json        # also write snapshot
 *   node scripts/bundle-report.mjs --compare before.json  # table + delta vs snapshot
 *
 * gzip sizes use node:zlib (level matching default gzip, i.e. what Vercel/CDN
 * serves). Raw size is the on-disk byte size.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import process from 'node:process';

const NEXT_DIR = join(process.cwd(), '.next');
const CHUNKS_DIR = join(NEXT_DIR, 'static', 'chunks');

// Strings that survive minification and only exist inside the motion/
// framer-motion engine. If a chunk contains one, it carries motion code.
const MOTION_SIGNATURES = [
	'MotionHandoffIsComplete', // motion-dom handoff (use-visual-element)
	'MotionIsMounted',
	'MotionHasOptimisedAnimation',
	'data-projection-id',
	'data-framer-portal-id',
	'lazy-strict-mode',
	'ProjectionNode',
];

function walkJsFiles(dir) {
	const out = [];
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const p = join(dir, e.name);
		if (e.isDirectory()) out.push(...walkJsFiles(p));
		else if (e.isFile() && e.name.endsWith('.js')) out.push(p);
	}
	return out;
}

function fmtBytes(n) {
	if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
	if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
	return n + ' B';
}

function collect() {
	const files = walkJsFiles(CHUNKS_DIR);
	const rows = files.map((p) => {
		const buf = readFileSync(p);
		const gz = gzipSync(buf, { level: 9 }).length;
		const rel = p.slice(NEXT_DIR.length + 1); // static/chunks/xxx.js
		let hasMotion = false;
		for (const sig of MOTION_SIGNATURES) {
			if (buf.includes(sig)) {
				hasMotion = true;
				break;
			}
		}
		return { file: rel, raw: buf.length, gzip: gz, motion: hasMotion };
	});
	rows.sort((a, b) => b.gzip - a.gzip);
	return rows;
}

function summarize(rows) {
	const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
	const totalGz = rows.reduce((s, r) => s + r.gzip, 0);
	const motionRows = rows.filter((r) => r.motion);
	const motionRaw = motionRows.reduce((s, r) => s + r.raw, 0);
	const motionGz = motionRows.reduce((s, r) => s + r.gzip, 0);
	return { chunks: rows.length, totalRaw, totalGz, motionChunks: motionRows.length, motionRaw, motionGz };
}

function printTable(rows, prevMap) {
	const w = (s, n) => String(s).padStart(n);
	const nameW = 44;
	console.log(w('file', nameW) + w('raw', 12) + w('gzip', 12) + w('Δraw', 12) + w('Δgzip', 12) + '  flags');
	console.log('-'.repeat(nameW + 12 * 4 + 8));
	for (const r of rows) {
		let dRaw = '';
		let dGz = '';
		if (prevMap) {
			const prev = prevMap[r.file];
			if (prev) {
				const dr = r.raw - prev.raw;
				const dg = r.gzip - prev.gzip;
				dRaw = (dr > 0 ? '+' : '') + dr;
				dGz = (dg > 0 ? '+' : '') + dg;
			} else {
				dRaw = 'NEW';
				dGz = 'NEW';
			}
		}
		const flags = [r.motion ? 'motion' : '', prevMap && !prevMap[r.file] ? 'new' : ''].filter(Boolean).join(',');
		console.log(
			w(r.file.length > nameW ? '…' + r.file.slice(-(nameW - 1)) : r.file, nameW) +
				w(fmtBytes(r.raw), 12) +
				w(fmtBytes(r.gzip), 12) +
				w(prevMap ? String(dRaw) : '', 12) +
				w(prevMap ? String(dGz) : '', 12) +
				'  ' +
				flags
		);
	}
}

function main() {
	const args = process.argv.slice(2);
	const jsonIdx = args.indexOf('--json');
	const compareIdx = args.indexOf('--compare');

	const rows = collect();
	if (rows.length === 0) {
		console.error('No JS chunks found under .next/static/chunks — run `npm run build` first.');
		process.exit(1);
	}

	let prevMap = null;
	let prevSummary = null;
	if (compareIdx !== -1) {
		try {
			const snap = JSON.parse(readFileSync(args[compareIdx + 1], 'utf8'));
			prevMap = Object.fromEntries(snap.rows.map((r) => [r.file, r]));
			prevSummary = snap.summary;
		} catch {
			console.error('Could not read compare snapshot, printing plain table.');
		}
	}

	printTable(rows, prevMap);
	const s = summarize(rows);
	console.log('-'.repeat(nameWStub()));
	console.log('chunks: ' + s.chunks);
	console.log('total raw:  ' + fmtBytes(s.totalRaw) + ' (' + s.totalRaw + ' bytes)');
	console.log('total gzip: ' + fmtBytes(s.totalGz) + ' (' + s.totalGz + ' bytes)');
	console.log('motion-flagged chunks: ' + s.motionChunks + ' — raw ' + fmtBytes(s.motionRaw) + ', gzip ' + fmtBytes(s.motionGz));
	if (prevSummary) {
		console.log('Δ total raw:  ' + (s.totalRaw - prevSummary.totalRaw) + ' bytes');
		console.log('Δ total gzip: ' + (s.totalGz - prevSummary.totalGz) + ' bytes');
		console.log('Δ motion gzip: ' + (s.motionGz - prevSummary.motionGz) + ' bytes');
	}

	if (jsonIdx !== -1 && args[jsonIdx + 1]) {
		writeFileSync(args[jsonIdx + 1], JSON.stringify({ generatedAt: new Date().toISOString(), summary: s, rows }, null, 2));
		console.log('\nsnapshot written: ' + args[jsonIdx + 1]);
	}
}

function nameWStub() {
	return 44 + 12 * 4 + 8;
}

main();

/**
 * Credits: The OpenUwU Project
 * Author:  @bre4d777
 * github.com/openUwU/
 *
 * Usage:
 *   node scripts/migrate.js        # apply all pending migrations
 *   node scripts/migrate.js --dry  # print SQL without touching PG
 *
 * Naming convention: NNN_description.sql (e.g. 001_init.sql)
 * Files are applied in lexicographic order and never re-applied.
 * To change schema, add a new file — never edit an existing one.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const envFilePath = join(projectRoot, ".env");
const schemaDirectory = join(projectRoot, "schema");
const dryRun = process.argv.includes("--dry");

if (existsSync(envFilePath)) {
	loadEnvFile(envFilePath);
}

const ESC = "\x1b";
const CLR = `${ESC}[0m`;
const log = {
	info: (msg) => console.log(`${ESC}[36m[migrate] ${msg}${CLR}`),
	success: (msg) => console.log(`${ESC}[32m[migrate] ${msg}${CLR}`),
	warn: (msg) => console.warn(`${ESC}[33m[migrate] ${msg}${CLR}`),
	error: (msg) => console.error(`${ESC}[31m[migrate] ${msg}${CLR}`),
	dim: (msg) => console.log(`${ESC}[90m${msg}${CLR}`),
};

function sha256(content) {
	return createHash("sha256").update(content, "utf-8").digest("hex");
}

async function main() {
	if (!process.env.POSTGRES_URL) {
		log.error("POSTGRES_URL is not set. Aborting.");
		process.exitCode = 1;
		return;
	}

	const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });
	const client = await pool.connect();

	try {
		await client.query(`
			CREATE TABLE IF NOT EXISTS _migrations (
				filename     TEXT        NOT NULL PRIMARY KEY,
				content_hash TEXT        NOT NULL DEFAULT '',
				applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
			)
		`);

		await client.query(`
			ALTER TABLE _migrations
				ADD COLUMN IF NOT EXISTS content_hash TEXT NOT NULL DEFAULT ''
		`);

		const { rows } = await client.query(
			"SELECT filename, content_hash FROM _migrations ORDER BY filename",
		);
		const applied = new Map(rows.map((row) => [row.filename, row.content_hash]));

		const allFiles = (await readdir(schemaDirectory))
			.filter((filename) => filename.endsWith(".sql"))
			.sort();

		for (const filename of allFiles) {
			if (applied.has(filename)) {
				const hash = sha256(await readFile(join(schemaDirectory, filename), "utf-8"));
				if (applied.get(filename) !== hash) {
					log.warn(
						`${filename} has been modified after being applied — create a new migration file instead of editing an existing one.`,
					);
				}
			}
		}

		const pending = allFiles.filter((filename) => !applied.has(filename));

		if (pending.length === 0) {
			log.info("No pending migrations. Database is up to date.");
			return;
		}

		log.info(`Pending: ${pending.join(", ")}`);
		if (dryRun) log.warn("--dry mode: no changes will be made.");

		for (const filename of pending) {
			const sql = await readFile(join(schemaDirectory, filename), "utf-8");
			const hash = sha256(sql);

			log.info(`Applying ${filename}…`);

			if (dryRun) {
				log.dim(sql.trim());
				continue;
			}

			await client.query("BEGIN");
			try {
				await client.query(sql);
				await client.query(
					`INSERT INTO _migrations (filename, content_hash)
					 VALUES ($1, $2)`,
					[filename, hash],
				);
				await client.query("COMMIT");
				log.success(`✓ ${filename}`);
			} catch (err) {
				await client.query("ROLLBACK");
				log.error(`✗ ${filename} failed — rolled back. Stopping.`);
				throw err;
			}
		}

		if (!dryRun) log.success(`Done. Applied ${pending.length} migration(s).`);
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	log.error(err instanceof Error ? err.message : String(err));
	process.exitCode = 1;
});

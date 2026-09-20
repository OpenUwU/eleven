/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { isFairplayMod } from "../../middlewares/fairplayGuard.js";
import { Middleware } from "../../middlewares/index.js";
import type { CommandContext } from "../../structures/context/index.js";
import { defineCommand } from "../../types/command.js";
import type { MusicPlayer, QueueTrack } from "../../types/index.js";
import { defContainer, errorContainer, TextDisplay } from "../../utils/components.js";

const MAX_DESC_LENGTH = 3000;

function parseRangeToken(token: string): number[] | null {
	const match = token.match(/^(\d+)\s*-\s*(\d+)$/);
	if (!match) return null;
	if (match[1] === match[2]) return null;
	if (!match[1]) return null;
	if (!match[2]) return null;
	const start = Number.parseInt(match[1], 10);
	const end = Number.parseInt(match[2], 10);

	if (start > end || end - start > 100) return null;

	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function parsePositions(input: string): number[] | null {
	if (!input.trim()) return null;

	const positions = new Set<number>();
	const tokens = input.split(/[\s,]+/).filter(Boolean);

	for (const token of tokens) {
		const range = parseRangeToken(token);
		if (range) {
			for (const n of range) positions.add(n);
			continue;
		}

		const num = Number.parseInt(token, 10);
		if (String(num) !== token || Number.isNaN(num) || num < 1) return null;
		positions.add(num);
	}

	return positions.size > 0 ? Array.from(positions).sort((a, b) => a - b) : null;
}

function validateIndexes(
	indexes: number[],
	queueSize: number,
): { valid: number[]; invalid: number[]; outOfRange: number[] } {
	const valid: number[] = [];
	const invalid: number[] = [];
	const outOfRange: number[] = [];

	for (const pos of indexes) {
		const idx = pos - 1;
		if (Number.isNaN(idx) || pos < 1) invalid.push(pos);
		else if (idx >= queueSize) outOfRange.push(pos);
		else valid.push(idx);
	}

	return { valid, invalid, outOfRange };
}

export function formatRemovedList(tracks: QueueTrack[]): string {
	if (tracks.length === 0) return "";
	if (tracks.length === 1) return `**${tracks[0]?.info.title}**`;
	if (tracks.length === 2) return `**${tracks[0]?.info.title}** and **${tracks[1]?.info.title}**`;

	const all = tracks.map((t) => `**${t.info.title}**`);
	return `${all.slice(0, -1).join(", ")}, and ${all[all.length - 1]}`;
}

function truncateDescription(desc: string, maxLen: number, totalCount: number): string {
	if (desc.length <= maxLen) return desc;

	const ellipsis = "...";
	const remaining = totalCount - 1;
	const suffix = ` and ${remaining} more`;
	const reserve = ellipsis.length + suffix.length;
	const cutoff = maxLen - reserve;

	let splitAt = desc.lastIndexOf(", ", cutoff);
	if (splitAt === -1) splitAt = cutoff;

	return `${desc.slice(0, splitAt)}${ellipsis}${suffix}`;
}

function buildWarnings(invalid: number[], outOfRange: number[], notYours = 0): string {
	const parts: string[] = [];
	if (invalid.length > 0) parts.push(`Invalid: ${invalid.join(", ")}`);
	if (outOfRange.length > 0) parts.push(`Out of range: ${outOfRange.join(", ")}`);
	if (notYours > 0) {
		const suffix = notYours > 1 ? "s" : "";
		parts.push(`Skipped ${notYours} song${suffix} (not yours — Fairplay is on)`);
	}
	return parts.join(" | ");
}

async function partitionByFairplayOwnership(
	ctx: CommandContext,
	player: MusicPlayer,
	indexes: number[],
): Promise<{ allowed: number[]; denied: number }> {
	if (!player.isFairplay() || (await isFairplayMod(ctx))) return { allowed: indexes, denied: 0 };

	const tracks = player.queue.toArray();
	const allowed: number[] = [];
	let denied = 0;
	for (const idx of indexes) {
		if (tracks[idx]?.requester.id === ctx.user.id) allowed.push(idx);
		else denied++;
	}
	return { allowed, denied };
}

async function replyRemoveError(
	ctx: CommandContext,
	title: string,
	description: string,
): Promise<void> {
	await ctx.reply({
		components: [errorContainer(title, description)],
		flags: MessageFlags.IsComponentsV2,
	});
}

function parseRemoveInput(ctx: CommandContext): string | undefined {
	if (!ctx.isSlash()) return ctx.args.join(" ").trim();
	return ctx.options.getString("positions", false)?.trim() || undefined;
}

function removeTracks(
	queue: { remove(indexes: number[]): QueueTrack[] },
	indexes: number[],
): QueueTrack[] {
	if (indexes.length === 0) return [];
	return queue.remove(indexes);
}

export default defineCommand({
	name: "remove",
	aliases: ["rm", "rem"],
	description: "Remove songs from the queue by position, range, or multiple positions",
	category: "music",
	usage: "remove <position | range | multiple positions>",
	slashUsage: "remove <position | range | multiple positions>",
	enabledSlash: true,
	middleware: [
		Middleware.Cooldown(10),
		Middleware.VoiceRequired(),
		Middleware.SameVoiceChannel(),
		Middleware.PlayerCheck("playing"),
	],
	slashData: {
		name: "remove",
		description: "Remove songs from the queue by position, range, or multiple positions",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "positions",
				description: "Positions to remove: 1, 3-5, 2,7 (1-based)",
				required: true,
				autocomplete: false,
			},
		],
	},
	async execute(ctx) {
		const player = ctx.client.music.getPlayer(ctx.guild.id);
		if (!player) return;

		if (player.queue.size === 0) {
			await replyRemoveError(ctx, "Empty Queue", "There are no songs in the queue to remove.");
			return;
		}

		const rawInput = parseRemoveInput(ctx);
		if (!rawInput) {
			await replyRemoveError(
				ctx,
				"Invalid Input",
				"Please provide positions to remove. Examples: `1`, `1-5`, `2,4,7`, `1-3,5,8-10`",
			);
			return;
		}

		const positions = parsePositions(rawInput);
		if (positions === null) {
			await replyRemoveError(
				ctx,
				"Invalid Format",
				"Could not parse positions. Use numbers, ranges (1-5), or commas (1,3,5).",
			);
			return;
		}

		const { valid, invalid, outOfRange } = validateIndexes(positions, player.queue.size);

		if (valid.length === 0) {
			await replyRemoveError(
				ctx,
				"Invalid Positions",
				`No valid positions to remove. ${buildWarnings(invalid, outOfRange)}`,
			);
			return;
		}

		const { allowed, denied } = await partitionByFairplayOwnership(ctx, player, valid);

		if (allowed.length === 0) {
			await replyRemoveError(
				ctx,
				"Fairplay Active",
				"Fairplay mode is on — you can only remove songs you requested yourself, or a mod can remove any.",
			);
			return;
		}

		const removed = removeTracks(player.queue, allowed);
		const warnings = buildWarnings(invalid, outOfRange, denied);

		if (removed.length === 0) {
			await replyRemoveError(ctx, "Remove Failed", "Could not remove any tracks.");
			return;
		}

		const suffix = removed.length > 1 ? "s" : "";
		const title = `**Removed ${removed.length} Song${suffix}**`;
		const rawDescription = formatRemovedList(removed);
		const description = truncateDescription(rawDescription, MAX_DESC_LENGTH, removed.length);

		await ctx.reply({
			components: [
				defContainer().addTextDisplayComponents(
					TextDisplay(
						[title, description ? `-# > ${description}` : "", warnings ? `-# ${warnings}` : ""]
							.filter(Boolean)
							.join("\n"),
					),
				),
			],
			flags: MessageFlags.IsComponentsV2,
		});
	},
});

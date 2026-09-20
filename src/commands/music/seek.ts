/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { Middleware } from "../../middlewares/index.js";
import type { CommandContext } from "../../structures/context/index.js";
import { defineCommand } from "../../types/index.js";
import { defContainer, errorContainer, TextDisplay } from "../../utils/components.js";
import { formatDuration } from "../../utils/duration.js";

const UNIT_MS: Record<string, number> = {
	h: 3_600_000,
	hr: 3_600_000,
	hrs: 3_600_000,
	hour: 3_600_000,
	hours: 3_600_000,
	m: 60_000,
	min: 60_000,
	mins: 60_000,
	minute: 60_000,
	minutes: 60_000,
	s: 1000,
	sec: 1000,
	secs: 1000,
	second: 1000,
	seconds: 1000,
};

function parsePlainSeconds(input: string): number | null {
	return /^\d+$/.test(input) ? Number(input) * 1000 : null;
}

function parseColonFormat(input: string): number | null {
	const match = input.match(/^(?:(\d+):)?(\d+):(\d+)$/);
	if (!match) return null;
	const [, h, m, s] = match;
	return (Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s)) * 1000;
}

function parseUnitFormat(input: string): number | null {
	const matches = [
		...input.matchAll(
			/(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/g,
		),
	];
	if (matches.length === 0) return null;
	const totalMs = matches.reduce(
		(sum, m) => sum + Number(m[1]) * (UNIT_MS[m[2] as string] ?? 0),
		0,
	);
	return totalMs > 0 ? totalMs : null;
}

function parsePosition(raw: string): number | null {
	const input = raw.trim().toLowerCase();
	return parsePlainSeconds(input) ?? parseColonFormat(input) ?? parseUnitFormat(input);
}

async function replySeekError(
	ctx: CommandContext,
	title: string,
	description: string,
): Promise<void> {
	await ctx.reply({
		components: [errorContainer(title, description)],
		flags: MessageFlags.IsComponentsV2,
	});
}

function parseSeekPositionArg(ctx: CommandContext): string {
	return ctx.isSlash() ? (ctx.options.getString("position", true) ?? "") : ctx.args.join(" ");
}

export default defineCommand({
	name: "seek",
	aliases: ["goto"],
	description: "Seek to a specific position in the current track",
	category: "music",
	usage: "seek <position>",
	slashUsage: "seek <position>",
	enabledSlash: true,
	middleware: [
		Middleware.Cooldown(10),
		Middleware.VoiceRequired(),
		Middleware.SameVoiceChannel(),
		Middleware.PlayerCheck("playing"),
		Middleware.FairplayModOnly(),
	],
	slashData: {
		name: "seek",
		description: "Seek to a specific position in the current track",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "position",
				description: "Position to seek to (e.g., 1:30, 90, 2:15:30)",
				required: true,
				autocomplete: false,
			},
		],
	},
	async execute(ctx) {
		const player = ctx.client.music.getPlayer(ctx.guild.id);
		if (!player) return;

		if (player.currentTrack?.info.isStream) {
			await replySeekError(ctx, "Cannot Seek", "Cannot seek in a live stream.");
			return;
		}

		if (!player.currentTrack?.info.isSeekable) {
			await replySeekError(ctx, "Cannot Seek", "The current track is not seekable.");
			return;
		}

		const positionArg = parseSeekPositionArg(ctx);
		if (!positionArg) {
			await replySeekError(ctx, "Missing Position", "Use format: `1:30`, `90`, or `2:15:30`.");
			return;
		}

		const position = parsePosition(positionArg);
		if (position === null) {
			await replySeekError(ctx, "Invalid Position", "Use format: `1:30`, `90`, or `2:15:30`.");
			return;
		}

		const duration = player.currentTrack.info.length;
		if (position < 0 || position > duration) {
			await replySeekError(
				ctx,
				"Invalid Position",
				`Must be between 0 and ${formatDuration(duration)}.`,
			);
			return;
		}

		await player.seek(position);

		await ctx.reply({
			components: [
				defContainer().addTextDisplayComponents(
					TextDisplay(
						`-# Seeked to \`${formatDuration(position)}\` / \`${formatDuration(duration)}\`.`,
					),
				),
			],
			flags: MessageFlags.IsComponentsV2,
		});
	},
});

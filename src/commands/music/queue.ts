/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import {
	type ButtonInteraction,
	ComponentType,
	type ContainerBuilder,
	MessageFlags,
	TextInputStyle,
} from "discord.js";
import { emoji } from "../../config/emoji.js";
import { isFairplayMod } from "../../middlewares/fairplayGuard.js";
import { Middleware } from "../../middlewares/index.js";
import type { CommandContext } from "../../structures/context/index.js";
import { defineCommand, type MusicPlayer, type QueueTrack } from "../../types/index.js";
import {
	ActionRow,
	baseSection,
	dangerButton,
	defContainer,
	emojiDangerButton,
	emojiSecondaryButton,
	errorContainer,
	Label,
	Modal,
	primaryButton,
	Separator,
	secondaryButton,
	TextDisplay,
	TextInput,
} from "../../utils/components.js";
import { formatDuration } from "../../utils/duration.js";

const TRACKS_PER_PAGE = 4;

interface ViewerPermissions {
	readonly viewerId: string;
	readonly isMod: boolean;
	readonly fairplayActive: boolean;
}

function truncate(text: string, length: number): string {
	if (!text) return "Unknown";
	return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function pageCountOf(size: number): number {
	return Math.max(1, Math.ceil(size / TRACKS_PER_PAGE));
}

function clampPage(page: number, size: number): number {
	return Math.min(Math.max(0, page), pageCountOf(size) - 1);
}

function buildNowPlaying(container: ContainerBuilder, player: MusicPlayer) {
	container.addTextDisplayComponents(TextDisplay("### Now Playing"));
	const current = player.currentTrack;
	if (!current) {
		container.addTextDisplayComponents(TextDisplay("Nothing is playing"));
		return;
	}
	const fullArtist: string = current?.info?.author || "Unknown";
	const mainArtist: string = fullArtist.split(/,|\/|;/)[0]?.trim() || "Unknown";
	const duration = current.info.isStream ? "Live" : formatDuration(current.info.length);
	const position = current.info.isStream ? "" : `${formatDuration(player.position)} • ${duration}`;
	container.addTextDisplayComponents(
		TextDisplay(
			`**[${current.info.title} - ${mainArtist}](${current.info.uri})**\n-# ${emoji.get("duration_grey")} \`${position}\``,
		),
	);
}

function buildTrackSection(
	container: ContainerBuilder,
	track: QueueTrack,
	index: number,
	isExpanded: boolean,
	allDisabled: boolean,
	queueLength: number,
	permissions: ViewerPermissions,
) {
	const duration = track.info.isStream ? "Live" : formatDuration(track.info.length);
	const fullArtist: string = track?.info?.author || "Unknown";
	const artistsArray: string[] = fullArtist.split(",").map((artist: string) => artist.trim());
	let artist: string = artistsArray.slice(0, 3).join(", ") || "Unknown";
	if (artistsArray.length > 3) {
		artist += " and more";
	}

	const isOwnTrack = track.requester.id === permissions.viewerId;
	const canPlay = !permissions.fairplayActive || permissions.isMod;
	const canRemove = !permissions.fairplayActive || permissions.isMod || isOwnTrack;
	const canReorder = !permissions.fairplayActive || permissions.isMod;

	container.addSectionComponents(
		baseSection()
			.addTextDisplayComponents(
				TextDisplay(
					`${index + 1}. [${truncate(track.info.title, 60)}](${track.info.uri})\n-# ${emoji.get("artist")} ${artist}\n\n-# ${emoji.get("requester")} <@${track.requester.id}>  \`●\`  ${emoji.get("duration_grey")} \`${duration}\``,
				),
			)
			.setButtonAccessory(
				emojiSecondaryButton(`track_toggle_${index}`, emoji.get("more"), allDisabled),
			),
	);
	if (!isExpanded) return;
	const row = ActionRow();
	row.addComponents(
		emojiSecondaryButton(`track_play_${index}`, emoji.get("play"), allDisabled || !canPlay),
	);
	if (index > 0)
		row.addComponents(
			emojiSecondaryButton(`track_up_${index}`, emoji.get("drag_up"), allDisabled || !canReorder),
		);
	if (index < queueLength - 1)
		row.addComponents(
			emojiSecondaryButton(
				`track_down_${index}`,
				emoji.get("drag_down"),
				allDisabled || !canReorder,
			),
		);
	row.addComponents(
		emojiDangerButton(`track_remove_${index}`, emoji.get("remove"), allDisabled || !canRemove),
	);
	container.addActionRowComponents(row);
}

function buildNavRow(page: number, pageCount: number, allDisabled: boolean) {
	const row = ActionRow();
	row.addComponents(
		emojiSecondaryButton("queue_prev", emoji.get("left"), allDisabled || page === 0),
		secondaryButton("Page", "queue_goto", allDisabled || pageCount < 2),
		emojiSecondaryButton("queue_next", emoji.get("right"), allDisabled || page >= pageCount - 1),
	);
	return row;
}

function buildCRow(allDisabled: boolean, permissions: ViewerPermissions) {
	const row = ActionRow();
	const orderDisabled = allDisabled || permissions.fairplayActive;
	const clearDisabled = allDisabled || (permissions.fairplayActive && !permissions.isMod);
	row.addComponents(
		primaryButton("Reverse", "queue_reverse", orderDisabled),
		primaryButton("Shuffle", "queue_shuffle", orderDisabled),
		dangerButton("Clear", "queue_clear", clearDisabled),
	);
	return row;
}

function buildQueueContainer(
	player: MusicPlayer,
	page: number,
	expanded: number | null,
	permissions: ViewerPermissions,
	allDisabled = false,
) {
	const container = defContainer();
	container.addTextDisplayComponents(TextDisplay("## Queue"));
	container.addSeparatorComponents(Separator(true));
	buildNowPlaying(container, player);
	container.addSeparatorComponents(Separator());
	const tracks = player.queue.toArray();
	if (tracks.length === 0) {
		container.addTextDisplayComponents(
			TextDisplay("-# Queue is empty, add more songs using `/play`"),
		);
		return container;
	}
	const pageCount = pageCountOf(tracks.length);
	const start = page * TRACKS_PER_PAGE;
	const end = Math.min(start + TRACKS_PER_PAGE, tracks.length);
	for (let i = start; i < end; i++) {
		const track = tracks[i];
		if (!track) continue;
		buildTrackSection(container, track, i, expanded === i, allDisabled, tracks.length, permissions);
	}
	container.addSeparatorComponents(Separator());
	container.addActionRowComponents(buildNavRow(page, pageCount, allDisabled));
	container.addActionRowComponents(buildCRow(allDisabled, permissions));
	if (permissions.fairplayActive) {
		const fairplayNotice = [
			`-# ${emoji.get("blank")}Fairplay is on`,
			"-# Shuffle/reverse are locked, and reordering/clearing are mod-only.",
			"-# You can still remove your own songs.",
		].join("\n");

		container.addTextDisplayComponents(TextDisplay(fairplayNotice));
	}
	container.addTextDisplayComponents(
		TextDisplay(
			`-# Page ${page + 1}/${pageCount}${emoji.get("blank")}${tracks.length} track${tracks.length === 1 ? "" : "s"}`,
		),
	);
	return container;
}

async function handleUnauthorized(interaction: ButtonInteraction) {
	await interaction.reply({
		components: [errorContainer("Not Authorized", "You are not authorized to do this.")],
		flags: MessageFlags.IsComponentsV2,
		ephemeral: true,
	});
}

async function handleGotoModal(
	interaction: ButtonInteraction,
	player: MusicPlayer,
	ctx: CommandContext,
) {
	const pageCount = pageCountOf(player.queue.size);
	const modal = Modal("queue_goto_modal", "Go to Page").addLabelComponents(
		Label(
			`Page (1–${pageCount})`,
			TextInput("queue_goto_page", TextInputStyle.Short, true)
				.setMinLength(1)
				.setMaxLength(String(pageCount).length)
				.setPlaceholder(`1–${pageCount}`),
		),
	);
	await interaction.showModal(modal);
	const submitted = await interaction
		.awaitModalSubmit({
			time: 60_000,
			filter: (i) => i.customId === "queue_goto_modal" && i.user.id === ctx.member.id,
		})
		.catch(() => null);
	if (!submitted) return null;
	await submitted.deferReply({ ephemeral: true });
	const raw = submitted.fields.getTextInputValue("queue_goto_page");
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed) || parsed < 1 || parsed > pageCountOf(player.queue.size)) {
		await submitted.editReply({
			components: [
				errorContainer(
					"Invalid Page",
					`Enter a number between 1 and ${pageCountOf(player.queue.size)}.`,
				),
			],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
		});
		return null;
	}
	return { submitted, parsed };
}

function isQueueStale(player: MusicPlayer, renderedAt: number): boolean {
	const lastUpdated = player.timestamps.lastQueueUpdatedAt;
	return lastUpdated !== null && lastUpdated > renderedAt;
}

async function handleStaleQueue(
	interaction: ButtonInteraction,
	player: MusicPlayer,
	page: number,
	expanded: number | null,
	permissions: ViewerPermissions,
) {
	page = clampPage(page, player.queue.size);
	expanded = null;
	await interaction.update({
		components: [buildQueueContainer(player, page, expanded, permissions)],
	});
	await interaction.followUp({
		components: [
			errorContainer(
				"Queue Changed",
				"The queue has changed since this message was sent. The view has been refreshed.",
			),
		],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
	});
}

function checkActionPermission(
	id: string,
	player: MusicPlayer,
	permissions: ViewerPermissions,
): { allowed: true } | { allowed: false; reason: string } {
	if (!permissions.fairplayActive || permissions.isMod) return { allowed: true };

	if (id === "queue_shuffle" || id === "queue_reverse") {
		return {
			allowed: false,
			reason: "Fairplay mode is on — shuffle and reverse are disabled.",
		};
	}
	if (id === "queue_clear") {
		return {
			allowed: false,
			reason: "Fairplay mode is on — only a mod can clear the queue.",
		};
	}
	if (id.startsWith("track_up_") || id.startsWith("track_down_")) {
		return {
			allowed: false,
			reason: "Fairplay mode is on — only a mod can reorder the queue.",
		};
	}
	if (id.startsWith("track_play_")) {
		return {
			allowed: false,
			reason: "Fairplay mode is on — only a mod can skip to a specific song.",
		};
	}
	if (id.startsWith("track_remove_")) {
		const idx = Number.parseInt(id.replace("track_remove_", ""), 10);
		const track = player.queue.toArray()[idx];
		if (track?.requester.id === permissions.viewerId) return { allowed: true };
		return {
			allowed: false,
			reason: "Fairplay mode is on — you can only remove songs you requested.",
		};
	}

	return { allowed: true };
}

function handleQueueAction(id: string, player: MusicPlayer, page: number) {
	if (id === "queue_prev") {
		return { page: Math.max(0, page - 1), expanded: null };
	}
	if (id === "queue_next") {
		return {
			page: Math.min(pageCountOf(player.queue.size) - 1, page + 1),
			expanded: null,
		};
	}
	if (id === "queue_clear") {
		player.clearQueue();
		return { page: 0, expanded: null };
	}
	if (id === "queue_shuffle") {
		player.shuffle();
		return { page: clampPage(page, player.queue.size), expanded: null };
	}
	if (id === "queue_reverse") {
		player.reverse();
		return { page: clampPage(page, player.queue.size), expanded: null };
	}
	return null;
}

function handleTrackAction(id: string, player: MusicPlayer, page: number, expanded: number | null) {
	if (id.startsWith("track_toggle_")) {
		const idx = Number.parseInt(id.replace("track_toggle_", ""), 10);
		return { page, expanded: expanded === idx ? null : idx };
	}
	if (id.startsWith("track_play_")) {
		const idx = Number.parseInt(id.replace("track_play_", ""), 10);
		const track = player.queue.toArray()[idx];
		if (track) player.play(track, { removeFromQueue: true });
		return { page: clampPage(page, player.queue.size), expanded: null };
	}
	if (id.startsWith("track_up_")) {
		const idx = Number.parseInt(id.replace("track_up_", ""), 10);
		if (idx > 0) {
			player.move(idx, idx - 1);
			return {
				page: Math.floor((idx - 1) / TRACKS_PER_PAGE),
				expanded: idx - 1,
			};
		}
		return { page, expanded };
	}
	if (id.startsWith("track_down_")) {
		const idx = Number.parseInt(id.replace("track_down_", ""), 10);
		if (idx < player.queue.size - 1) {
			player.move(idx, idx + 1);
			return {
				page: Math.floor((idx + 1) / TRACKS_PER_PAGE),
				expanded: idx + 1,
			};
		}
		return { page, expanded };
	}
	if (id.startsWith("track_remove_")) {
		const idx = Number.parseInt(id.replace("track_remove_", ""), 10);
		player.remove(idx);
		return { page: clampPage(page, player.queue.size), expanded: null };
	}
	return null;
}

export default defineCommand({
	name: "queue",
	aliases: ["q", "list"],
	description: "View the music queue",
	category: "music",
	enabledSlash: true,
	slashData: {
		name: "queue",
		description: "View the music queue",
	},
	middleware: [
		Middleware.Cooldown(20),
		Middleware.VoiceRequired(),
		Middleware.SameVoiceChannel(),
		Middleware.PlayerCheck("playing"),
	],
	async execute(ctx) {
		const player = ctx.client.music.getPlayer(ctx.guild.id);
		if (!player) return;

		let page = 0;
		let expanded: number | null = null;
		const isFpMod = await isFairplayMod(ctx);
		const permissionsFor = (): ViewerPermissions => ({
			viewerId: ctx.member.id,
			isMod: isFpMod,
			fairplayActive: player.isFairplay(),
		});

		const message = await ctx.reply({
			components: [buildQueueContainer(player, page, expanded, permissionsFor())],
			flags: MessageFlags.IsComponentsV2,
		});

		let lastRenderedAt = Date.now();

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 300_000,
		});

		const modalCollector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) => i.customId === "queue_goto" && i.user.id === ctx.member.id,
			time: 300_000,
		});

		collector.on("collect", async (interaction) => {
			if (interaction.user.id !== ctx.member.id) {
				await handleUnauthorized(interaction);
				return;
			}

			const id = interaction.customId;

			if (id === "queue_goto") {
				const result = await handleGotoModal(interaction, player, ctx);
				if (!result) return;
				page = clampPage(result.parsed - 1, player.queue.size);
				expanded = null;
				await result.submitted.message?.edit({
					components: [buildQueueContainer(player, page, expanded, permissionsFor())],
				});
				lastRenderedAt = Date.now();
				await result.submitted.followUp({
					components: [
						defContainer().addTextDisplayComponents(
							TextDisplay(`Page changed to page ${page + 1}.`),
						),
					],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
				});
				return;
			}

			if (isQueueStale(player, lastRenderedAt)) {
				await handleStaleQueue(interaction, player, page, expanded, permissionsFor());
				lastRenderedAt = Date.now();
				page = clampPage(page, player.queue.size);
				expanded = null;
				return;
			}

			const permission = checkActionPermission(id, player, permissionsFor());
			if (!permission.allowed) {
				await interaction.reply({
					components: [errorContainer("Fairplay Active", permission.reason)],
					flags: MessageFlags.IsComponentsV2,
					ephemeral: true,
				});

				await message
					.edit({ components: [buildQueueContainer(player, page, expanded, permissionsFor())] })
					.catch(() => undefined);
				lastRenderedAt = Date.now();
				return;
			}

			let result: { page: number; expanded: number | null } | null = handleQueueAction(
				id,
				player,
				page,
			);
			if (!result) result = handleTrackAction(id, player, page, expanded);
			if (result) {
				page = result.page;
				expanded = result.expanded;
			}

			await interaction.update({
				components: [buildQueueContainer(player, page, expanded, permissionsFor())],
			});
			lastRenderedAt = Date.now();
		});

		collector.on("end", async () => {
			try {
				await message.edit({
					components: [buildQueueContainer(player, page, expanded, permissionsFor(), true)],
				});
				lastRenderedAt = Date.now();
			} catch {
				// empty
			}
		});
		modalCollector.on("end", async () => {
			// empty because no action needed when the modal collector ends
		});
	},
});

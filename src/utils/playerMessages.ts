/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { type ContainerBuilder, MessageFlags, Routes } from "discord.js";
import { emoji } from "../config/emoji.js";
import type { BotClient } from "../core/BotClient.js";
import type { MusicPlayer } from "../structures/music/index.js";
import type { QueueTrack } from "../structures/music/types.js";
import {
	baseSection,
	defContainer,
	errorContainer,
	Separator,
	TextDisplay,
	Thumbnail,
} from "./components.js";
import { logger } from "./logger.js";
import { buildPlayerControlsRow } from "./playerButtons/index.js";

export const NP_MESSAGE_KEY = "npMessage";

export interface NpMessageRef {
	readonly channelId: string;
	readonly messageId: string;
}

function fmtMs(ms: number): string {
	const totalSec = Math.floor(ms / 1_000);
	const minutes = Math.floor(totalSec / 60);
	const seconds = totalSec % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sanitizeTrackText(input: string): string {
	return input
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9. ]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function truncateTitle(title: string, max = 45): string {
	return title.length > max ? `${title.slice(0, max).trimEnd()}...` : title;
}

export async function sendTrackStuck(player: MusicPlayer, client: BotClient): Promise<void> {
	const channelId = player.currentTextChannelId;
	if (!channelId) return;
	const errorCont = errorContainer(
		"Track stuck",
		"The track has been skipped due to an error.",
	);

	try {
		await client.rest.post(Routes.channelMessages(channelId), {
			body: {
				components: [errorCont.toJSON()],
				allowed_mentions: { parse: [] },
				flags: MessageFlags.IsComponentsV2,
			},
		});
	} catch (err) {
		logger.warn("playerMessages", `Failed to send stuck message: ${(err as Error).message}`);
	}
}
export async function sendTrackError(player: MusicPlayer, client: BotClient): Promise<void> {
	const channelId = player.currentTextChannelId;
	if (!channelId) return;
	const errorCont = errorContainer(
		"Track error",
		"The track has been skipped due to an error.",
	);

	try {
		await client.rest.post(Routes.channelMessages(channelId), {
			body: {
				components: [errorCont.toJSON()],
				allowed_mentions: { parse: [] },
				flags: MessageFlags.IsComponentsV2,
			},
		});
	} catch (err) {
		logger.warn("playerMessages", `Failed to send error message: ${(err as Error).message}`);
	}
}

function buildNowPlayingContainer(player: MusicPlayer, track: QueueTrack): ContainerBuilder {
	const info = track.info;
	const duration = info.isStream ? "Live" : fmtMs(info.length);
	const loopMode = player.getLoop();
	const queueSize = player.queue.size;
	const autoplay = player.getAutoplay();
	const fairplay = player.isFairplay();

	const bottomLine =
		loopMode === "track"
			? "Looping the track"
			: loopMode === "queue"
				? `Looping queue (${queueSize} track${queueSize === 1 ? "" : "s"})`
				: queueSize > 0
					? `${queueSize} track${queueSize === 1 ? "" : "s"} in queue`
					: null;

	const toggleLine =
		autoplay && fairplay
			? "Autoplay and Fairplay enabled"
			: autoplay
				? "Autoplay enabled"
				: fairplay
					? "Fairplay enabled"
					: null;

	const title = truncateTitle(sanitizeTrackText(info.title));
	const firstArtist = sanitizeTrackText(info.author.split(",")[0] ?? info.author);

	const section = baseSection().addTextDisplayComponents(
		TextDisplay(
			`### [${title}](${info.uri})\n-# ${emoji.get("artist")} ${firstArtist}\n\n-# By <@${track.requester.id}>${emoji.get("blank")}${emoji.get("duration_grey")} \`${duration}\``,
		),
	);

	if (info.artworkUrl) {
		section.setThumbnailAccessory(Thumbnail("cover art", info.artworkUrl));
	} else {
		section.setThumbnailAccessory(
			Thumbnail("no artwork", "https://cdn.discordapp.com/embed/avatars/0.png"),
		);
	}

	const container = defContainer()
		.addTextDisplayComponents(TextDisplay("-# **Currently Playing**"))
		.addSectionComponents(section)
		.addSeparatorComponents(Separator());

	if (toggleLine) container.addTextDisplayComponents(TextDisplay(`-# ${toggleLine}`));

	container.addActionRowComponents(buildPlayerControlsRow(player));

	if (bottomLine) container.addTextDisplayComponents(TextDisplay(`-# ${bottomLine}`));

	return container;
}

export async function sendNowPlaying(
	player: MusicPlayer,
	track: QueueTrack,
	client: BotClient,
): Promise<void> {
	const channelId = player.currentTextChannelId;
	if (!channelId) return;

	const container = buildNowPlayingContainer(player, track);

	try {
		const sent = (await client.rest.post(Routes.channelMessages(channelId), {
			body: {
				components: [container.toJSON()],
				allowed_mentions: { parse: [] },
				flags: MessageFlags.IsComponentsV2,
			},
		})) as { id: string };

		player.data.set<NpMessageRef>(NP_MESSAGE_KEY, {
			channelId,
			messageId: sent.id,
		});
	} catch (err) {
		logger.warn("NowPlaying", `Failed to send NP message: ${(err as Error).message}`);
	}
}

export async function updateNowPlaying(player: MusicPlayer, client: BotClient): Promise<void> {
	const ref = player.data.get<NpMessageRef>(NP_MESSAGE_KEY);
	if (!ref) return;

	const track = player.currentTrack;
	if (!track) {
		await deleteNowPlaying(player, client);
		return;
	}

	const container = buildNowPlayingContainer(player, track);

	try {
		await client.rest.patch(Routes.channelMessage(ref.channelId, ref.messageId), {
			body: {
				components: [container.toJSON()],
				allowed_mentions: { parse: [] },
				flags: MessageFlags.IsComponentsV2,
			},
		});
	} catch (err) {
		logger.warn("NowPlaying", `Failed to update NP message: ${(err as Error).message}`);
	}
}

export async function deleteNowPlaying(player: MusicPlayer, client: BotClient): Promise<void> {
	const ref = player.data.get<NpMessageRef>(NP_MESSAGE_KEY);
	if (!ref) return;

	player.data.del(NP_MESSAGE_KEY);

	try {
		await client.rest.delete(Routes.channelMessage(ref.channelId, ref.messageId));
	} catch {
		// 404 = already deleted / not accessible — expected, ignore silently
	}
}

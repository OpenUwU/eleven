/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import type { BotClient } from "../../core/BotClient.js";
import { guildStore } from "../../db/stores/guild.js";
import type { MusicPlayer as Player } from "../../structures/music/index.js";
import { logger } from "../logger.js";
import { sleep } from "../sleep.js";
import { MINUTES, registerCron } from "./index.js";

const STALE_PAUSE_THRESHOLD_MS = 4 * MINUTES;
const CHECK_INTERVAL_MS = 5 * MINUTES;
const RATE_LIMIT_DELAY_MS = 5_000;

function pausedTooLong(player: Player, now: number): boolean {
	if (player.destroyed || !player.paused) return false;
	const pausedSince = player.timestamps.lastPlayStateChangedAt ?? player.timestamps.createdAt;
	return now - pausedSince >= STALE_PAUSE_THRESHOLD_MS;
}

async function isChannelEmpty(client: BotClient, channelId: string): Promise<boolean> {
	let channel = client.channels.cache.get(channelId);
	if (!channel) {
		channel = (await client.channels.fetch(channelId).catch(() => null)) ?? undefined;
	}
	if (!channel?.isVoiceBased()) return true;
	return channel.members.filter((member) => !member.user.bot).size === 0;
}

registerCron({
	name: "stale-player-cleanup",
	intervalMs: CHECK_INTERVAL_MS,
	async run(client) {
		const now = Date.now();

		for (const [guildId, player] of client.music.players) {
			if (player.destroyed) continue;

			if (!player.hasCurrentTrack && player.queue.size === 0) continue;
			// biome-ignore lint/performance/noAwaitInLoops: required
			const guild = await guildStore.get(guildId).catch(() => null);
			const twentyFourSeven = guild?.twentyFourSeven ?? false;

			const stalePaused = pausedTooLong(player, now);

			const empty =
				!twentyFourSeven && player.voiceChannelId
					? await isChannelEmpty(client, player.voiceChannelId)
					: false;

			if (!empty && !stalePaused) continue;

			logger.debug(
				"Cron",
				`[${guildId}] Stopping stale player (${empty ? "empty" : "paused too long"})`,
			);

			try {
				await player.stop();
			} catch (err) {
				logger.error("Cron", `[${guildId}] Failed to stop stale player`, err as Error);
			}

			await sleep(RATE_LIMIT_DELAY_MS);
		}
	},
});

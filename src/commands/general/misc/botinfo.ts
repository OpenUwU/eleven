/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { MessageFlags, TimestampStyles, time } from "discord.js";
import { Middleware } from "../../../middlewares/index.js";
import { defineCommand } from "../../../types/index.js";
import { defContainer, TextDisplay } from "../../../utils/components.js";
export default defineCommand({
	name: "botinfo",
	aliases: ["bi"],
	description: "view bot info",
	category: "meta",
	enabledSlash: true,
	slashData: {
		name: "botinfo",
		description: "bot info",
	},
	middleware: [Middleware.Cooldown(10), Middleware.VoteRequired()],
	async execute(ctx) {
		let readyAt = ctx.client.readyAt;
		if (!readyAt) readyAt = new Date();
		const mem = process.memoryUsage();
		const rss = Math.round(mem.rss / 1024 / 1024);
		const heapUsed = Math.round(mem.heapUsed / 1024 / 1024);
		const techStack = [
			"[TypeScript](https://www.typescriptlang.org/)",
			"[Bun](https://bun.sh/)",
			"[Postgres](https://www.postgresql.org/)",
			"[Redis](https://redis.io/)",
			"[Discord.js](https://discord.js.org/)",
			"[Shoukaku](https://github.com/shipgirlproject/Shoukaku/)",
			"[lavalink](https://github.com/lavalink-devs/Lavalink/)",
		];

		const container = defContainer().addTextDisplayComponents(
			TextDisplay("### About Eleven"),
			TextDisplay(
				"Eleven is a [open source](https://github.com/openUwU/eleven) Discord bot made by [OpenUwU](https://github.com/openUwU) and [mooncarli](https://github.com/mooncarli).",
			),
			TextDisplay(
				`- **Bot Info**\n>>> -# \`${ctx.client.guilds.cache.size}\` servers\n-# Last restart: ${time(Math.floor(readyAt.getTime() / 1000), TimestampStyles.RelativeTime)}\n-# \`${rss}MB\` RSS\n-# \`${heapUsed}MB\` heap used`,
			),
			TextDisplay(`- **Tech Stack** \n>>> ${techStack.join("\n ")}`),
		);

		await ctx.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	},
});

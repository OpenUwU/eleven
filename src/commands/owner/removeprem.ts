/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { createHmac } from "node:crypto";
import { config } from "../../config/config.js";
import { Middleware } from "../../middlewares/index.js";
import { defineCommand } from "../../types/index.js";

export default defineCommand({
	name: "removeprem",
	aliases: ["revokeprem", "delprem"],
	description: "Fire a signed premium.revoke webhook event at our own webhook endpoint",
	category: "owner",
	enabledSlash: false,
	middleware: [Middleware.OwnerOnly()],
	async execute(ctx) {
		if (ctx.isSlash()) {
			await ctx.reply({ content: "This command cannot be used as a slash command." });
			return;
		}

		const [targetId] = ctx.args;

		if (!targetId) {
			await ctx.reply({ content: "<userId>" });
			return;
		}

		const { webhookSecret } = config.premium;
		const webhookPort = config.webhookPort;
		if (!webhookSecret) {
			await ctx.reply({ content: "PREMIUM_WEBHOOK_SECRET isn't set — can't sign a test payload." });
			return;
		}

		const body = JSON.stringify({
			type: "premium.revoke",
			data: { userId: targetId },
		});

		const timestamp = Math.floor(Date.now() / 1000).toString();
		const signature = createHmac("sha256", webhookSecret)
			.update(`${timestamp}.${body}`)
			.digest("hex");

		const url = `http://localhost:${webhookPort}/webhooks/premium`;

		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-premium-signature": `t=${timestamp},v1=${signature}`,
					"x-premium-trace": `manual-${timestamp}`,
				},
				body,
			});

			const text = await res.text();
			await ctx.reply({
				content: `POST ${url} -> ${res.status}${text ? ` (${text})` : ""}`,
			});
		} catch (err) {
			await ctx.reply({
				content: `Failed to reach webhook server at ${url}: ${(err as Error).message}`,
			});
		}
	},
});

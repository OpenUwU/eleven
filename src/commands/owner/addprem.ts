/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import { createHmac } from "node:crypto";
import { config } from "../../config/config.js";
import { PremiumConfig } from "../../config/premium.js";
import { Middleware } from "../../middlewares/index.js";
import { defineCommand } from "../../types/index.js";

export default defineCommand({
	name: "addprem",
	aliases: ["giveprem", "grantprem"],
	description: "Fire a signed premium.grant event at our own webhook endpoint",
	category: "owner",
	enabledSlash: false,
	middleware: [Middleware.OwnerOnly()],
	async execute(ctx) {
		if (ctx.isSlash()) {
			await ctx.reply({ content: "This command cannot be used as a slash command." });
			return;
		}

		const [targetId, tierArg] = ctx.args;

		if (!targetId || !tierArg) {
			const validTiers = PremiumConfig.getAllTiers()
				.map((t) => t.id)
				.join(", ");
			await ctx.reply({ content: `<userId> <tier>\nValid tiers: ${validTiers}` });
			return;
		}

		const tierId = tierArg.toLowerCase();
		if (!PremiumConfig.isValidTier(tierId)) {
			const validTiers = PremiumConfig.getAllTiers()
				.map((t) => t.id)
				.join(", ");
			await ctx.reply({ content: `Invalid tier "${tierArg}". Valid tiers: ${validTiers}` });
			return;
		}

		const { webhookSecret } = config.premium;
		const webhookPort = config.webhookPort;
		if (!webhookSecret) {
			await ctx.reply({ content: "PREMIUM_WEBHOOK_SECRET isn't set — can't sign a test payload." });
			return;
		}

		const body = JSON.stringify({
			type: "premium.grant",
			data: { userId: targetId, tier: tierId },
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

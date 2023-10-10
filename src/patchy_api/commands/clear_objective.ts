
import { commandBuilder, players } from '../modules.js';
import config from '../config.js';
import { DisplaySlotId, world } from '@minecraft/server';
const { commandPrefix: prefix } = config;
commandBuilder.register('cleardisplay', {
	description: "clear-display",
	usages: [
		`${prefix}ban playerName`,
	],
	aliases: ['cd'],
	prefix,
	requires: {
		score: {
			staff: 1
		}
	},
	callback: (sender, args) => {
		const [slot] = args;
		if (!slot) return sender.sendMessage('forgot slot');
		world.scoreboard.clearObjectiveAtDisplaySlot(slot as DisplaySlotId);
	}
});
import { world } from '@minecraft/server';
import { eventBuilder, global, content } from '../../patchy_api/modules.js';
global.players = {};
eventBuilder.subscribe('1init_player*API', {
	playerJoined: ({ player }) => {
		const { id, name } = player;
		// content.warn({ t: '1init_player', name, id });
		global.playerMap[id] = {};
		global.playerMap[id].loaded = true;
		global.players[id] = player;
	}
});
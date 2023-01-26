import { BlockAreaSize, Vector, world, Location, MinecraftBlockTypes, BlockLocation, Dimension } from "@minecraft/server";
import { andArray, betweenBlockVector3, blockFaceToCoords, content, isDefined, isVector2, isVector3, native, orArray, overworld, server, sort3DVectors } from "../../utilities.js";
import eventBuilder from "../events/export_instance.js";
import databases from "../database.js";
import players from "../players/export_instance.js";
import teleportBuilder from "../teleport.js";
import { Player } from "../player/class.js";
import gamemode from "../gamemode.js";
import structureBuilder from "../structure/export_instance.js";
const gamemodes = [0, 1, 2];
export class PlotsVector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
export class BlockVector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
const rotations = ['0_degrees', '90_degrees', '180_degrees', '270_degrees'];
const mirrors = ['none', 'x', 'xz', 'z'];
const animationModes = ['block_by_block', 'layer_by_layer'];
const directions = ['x', '-x', 'z', '-z'];
const permisions = ['read', 'write'];
function objectVector3(vector3) {
	const { x, y, z } = vector3;
	return ({ x, y, z });

}
export class PlotBuilder {
	constructor() {
		this.plots = {};
		this.creates = {};
		this.subscribedQueue = false;
	}
	runCreateQueue() {
		content.warn('runCreateQueue28923382782372388372278');
		const plotThis = this;
		if (!this.subscribedQueue) {
			eventBuilder.subscribe('init_zplotCreateQueue', {
				tickAfterLoad: () => {
					const keys = Object.keys(plotThis.creates);
					// content.warn('init_zplotCreateQueue', keys.length);
					if (!keys.length) return console.warn('ehy'), plotThis.subscribedQueue = false, eventBuilder.unsubscribe('init_zplotCreateQueue', 'tickAfterLoad');

					// content.warn({ plotThis });
					keys.forEach(key => {
						const rules = plotThis.creates[key];
						delete plotThis.creates[key];
						const { ruleSets, size, start } = rules;
						let maxZ = 0, maxX = 0;
						const generatedRuleSets = ruleSets.reduce((sumation, ruleSet, i) => {
							const { count, start: startRuleSet, direction, size: sizeRuleSet } = ruleSet;
							const { y } = start;
							if (count) {
								let change;
								switch (direction) {
									case 'x':
										change = { x: sizeRuleSet?.x ?? size.x, z: 0 };
										break;
									case '-x':
										change = { x: -(sizeRuleSet?.x ?? size.x), z: 0 };
									case 'z':
										change = { x: 0, z: sizeRuleSet?.z ?? size.z };
										break;
									case '-z':
										change = { x: 0, z: -(sizeRuleSet?.z ?? size.z) };
										break;
								}
								// content.warn({ size, change });
								const { x, z } = startRuleSet;
								// content.warn({ start: { x: start.x, z: start.z }, size: { x: size.x, z: size.z }, startRuleSet });
								let lastSize = { x: start.x + x * size.x, z: start.z + z * size.z };
								// content.warn({ lastSize });
								for (let c = 0; c < count; c++) {
									let currentSize;
									if (startRuleSet instanceof PlotsVector3) {
										currentSize = { x: ((c === 0) ? 0 : change.x) + lastSize.x, y, z: ((c === 0) ? 0 : change.z) + lastSize.z };
										lastSize = currentSize;
									}
									const { x: xC, z: zC } = currentSize;
									const rX = xC - x + 1;
									const rZ = zC - z + 1;
									if (rX > maxX) maxX = rX;
									if (rZ > maxZ) maxZ = rZ;
									sumation.push({
										...ruleSet, ...{
											start: currentSize
										},
										...(sizeRuleSet ? {} : {
											size
										})
									});

								}
								return sumation;
							}

						}, []);
						plotThis.plots[key] = {};
						plotThis.plots[key].rules = rules;
						plotThis.plots[key].rules.ruleSets = generatedRuleSets;
						plotThis.plots[key].players = {};
						Object.assign(plotThis.plots[key].rules, { maxX, maxZ });
						const plots = databases.get('plots*API') ?? databases.add('plots*API');
						content.warn({ t: '11111111111111111', plots, databases: databases.getFromEntity('plots*API') });
						let { availablePlots = [0], currentIndex = 0, hasBeenSubscribed = false } = plots.get(key) ?? {};
						if (hasBeenSubscribed) plotThis.subscribe(key);
						plots.set(key, { availablePlots, currentIndex, hasBeenSubscribed });
						databases.queueSave('plots*API');
					});
				}
			});
			// content.warn({ eventBuilder });
			this.subscribedQueue = true;
		}
	}
	create(key, rules) {
		// content.warn(key, rules);
		if (typeof key !== 'string') throw new Error(`key: ${key}, at params[0] is not of type: String!`);
		if (!(rules instanceof Object)) throw new Error(`rules in rules at params[1] is not of type: Object!`);
		let { size, start, ruleSets, property, plotNumberIdentifier, structure, teleport, loop = false, loopDirection, defaultPermision, defaultGamemode } = rules;
		// content.warn({ plotNumberIdentifier });
		if (typeof plotNumberIdentifier !== 'string') throw new Error('plotNumberIdentifier in rules at params[1] is not of type: String!');
		if (typeof property !== 'boolean') throw new Error('plotNumberIdentifier in rules at params[1] is not of type: Boolean!');
		if (size && !(size instanceof BlockAreaSize)) throw new Error(`size, in rules at params[1] is not of type: BlockAreaSize!`);
		if (!size && !ruleSets) throw new Error(`size and ruleSets, in rules at params[1] are not defined therefore size in either is not defined!`);
		const indexsSize = ruleSets.reduce((sumation, current, i) => { if (!(current.size instanceof BlockAreaSize)) { sumation.push(i); return sumation; } }, []);
		if (!size && ruleSets && indexsSize.length) throw new Error(`ruleSets, at indexs: ${andArray(indexsSize)} in rules at params[1]!`);
		if (!start) throw new Error(`start, in rules at params[1] is not defined!`);
		if (!isVector3(start)) throw new Error(`start, in rules at params[1] is not of type: Vector3!`);
		if (typeof loop !== 'boolean') throw new Error(`loop, in rules at params[1] is defined and not of type: Boolean!`);
		if (!loop && loopDirection) throw new Error(`loopDirection, in rules at params[1] is defined and loop is not defined!`);
		if (loopDirection && !directions.includes(loopDirection)) throw new Error(`loopDirection, in rules at params[1] is defined and not one of the following: ${orArray(directions)}`);
		if (defaultPermision && !permisions.includes(defaultPermision)) throw new Error(`defaultPermision, in rules at params[1] is defined and is not one of the following: ${orArray(permisions)}!`);
		if (defaultGamemode && !gamemodes.includes(defaultGamemode)) throw new Error(`defaultGamemode, in rules at params[1] is defined and is not one of the following: ${orArray(gamemodes)}!`);
		if (structure) {
			if (!(structure instanceof Object)) throw new Error(`structure, in rules at params[1] is defined and not of type: Object!`);
			const { name, location, rotation = '0_degrees', mirror = 'none', animationMode = 'block_by_block', animationSeconds = 0, includesEntites = true, includesBlocks = true, waterlogged = false, integrity = 100, seed } = structure;
			if (typeof name !== 'string') throw new Error(`name in structure in rules at params[1] is not of type: String!`);
			if (!isVector3(location)) throw new Error(`location in structure in rules at params[1] is not of type: Vector3!`);
			if (!rotations.includes(rotation)) throw new Error(`rotation in structure in rules at params[1] is not one of the following: ${orArray(rotations)}!`);
			if (!mirrors.includes(mirror)) throw new Error(`mirror in structure in rules at params[1] is not one of the following: ${orArray(mirrors)}!`);
			if (!animationModes.includes(animationMode)) throw new Error(`animationMode in structure in rules at params[1] is not one of the following: ${orArray(animationModes)}!`);
			if (typeof animationSeconds !== 'number') throw new Error(`animationSeconds in structure in rules at params[1] is not of type: Number!`);
			if (typeof includesEntites !== 'boolean') throw new Error(`includesEntites in structure in rules at params[1] is not of type: Boolean!`);
			if (typeof includesBlocks !== 'boolean') throw new Error(`includesBlocks in structure in rules at params[1] is not of type: Boolean!`);
			if (typeof waterlogged !== 'boolean') throw new Error(`waterlogged in structure in rules at params[1] is not of type: Boolean!`);
			if (typeof integrity !== 'number') throw new Error(`integrity in structure in rules at params[1] is not of type: Number!`);
			if (seed && typeof seed !== 'string') throw new Error(`seed in structure in rules at params[1] is not of type: String!`);
		}
		if (teleport) {
			if (!(teleport instanceof Object)) throw new Error(`structure, in rules at params[1] is defined and not of type: Object!`);
			const { location, face } = teleport;
			if (!isVector3(location)) throw new Error(`location, in teleport in rules at params[1] is not of type: Vector3!`);
			if (face && !isVector2(face)) throw new Error(`face, in teleport in rules at params[1] is defined and not of type: XYRotation or Vector3!`);
			if (face && !isVector2(face)) throw new Error(`face, in teleport in rules at params[1] is defined and not of type: XYRotation or Vector3!`);
		}

		ruleSets.forEach(({ count, start, direction, offset }, i) => {
			if (!(start instanceof PlotsVector3) && !(start instanceof BlockVector3)) throw new Error(`start at ruleSets[${i}] in rules at params[1] is not of type: BlockVector3 or PlotVector3  `);
			if (count && typeof count !== 'number') throw new Error(`count at ruleSets[${i}] in rules at params[1] is not of type: number`);
			if (!directions.includes(direction)) throw new Error(`direction, ${direction} at ruleSets[${i}] in rules at params[1] is not one of the following: ${orArray(directions)}`);
			if (offset && !isVector3(offset)) throw new Error(`offset, at ruleSets[${i}] in rules at params[1] is not of type: {x: number, y: number, z: number})}`);
		});
		this.creates[key] = rules;
		(property) ? players.registerProperty(plotNumberIdentifier, { type: 'number' })
			: server.objectiveAdd(plotNumberIdentifier);
		this.runCreateQueue();
		// content.warn({ plot: this });
	}
	query(player, key) {
		const { scores, properties } = player;
		const { plotNumberIdentifier, property } = this.plots[key].rules;
		return ((property) ? properties : scores)[plotNumberIdentifier];
	}
	set(player, key, plotNumber) {
		const { scores, properties } = player;
		const { plotNumberIdentifier, property, subscribed } = this.plots[key];
		const plots = databases.get('plots*API') ?? databases.add('plots*API');
		let { availablePlots = [0], currentIndex = 0, hasBeenSubscribed = false } = plots.get(key);
		if (currentIndex >= plotNumber && !availablePlots.includes(plotNumber)) return false;
		if (currentIndex < plotNumber) {
			for (let i = currentIndex + 1; i < plotNumber; i++) {
				availablePlots.push(i);
			}
		}
		((property) ? properties : scores)[plotNumberIdentifier] = plotNumber;
		availablePlots = availablePlots.filter(value => value !== plotNumber);
		plots.set(key, { availablePlots, currentIndex, hasBeenSubscribed });
		databases.queueSave('plots*API');
		return true;
	}
	list(key) {
		const plots = databases.get('plots*API') ?? databases.add('plots*API');
		let { availablePlots = [0] } = plots.get(key);
		return availablePlots;
	}
	setCurrent(player, key) {
		player.memory.currentPlot = key;
	}
	setOveride(player, key, value) {
		if (!memory.hasOwnProperty('plotOverides')) player.memory.plotOverides = {};
		player.memory.plotOverides[key] = value;
	}
	getRuleSet(key, number) {
		if (!this.plots.hasOwnProperty(key)) throw new Error(`key: ${key}, does not exist!`);
		const { ruleSets, loop, start, loopDirection, maxX, maxZ } = this.plots[key].rules;
		if (!isDefined(number)) throw new Error('why is number not defined');
		if (!loop) return ruleSets[number];
		const row = Math.floor(ruleSets.length / number);
		const column = ruleSets.length % number;
		content.warn({ t: "wwdwddwwdwd", len: ruleSets.length, number: isDefined(number), column, bool: overworld instanceof Dimension });
		const ruleSet = ruleSets[column];
		const { start: startRuleSet, offset, calculated } = ruleSet;
		let { x, y, z } = startRuleSet;
		switch (loopDirection) {
			case 'x': {
				z += maxZ * row + offset.z * (row + 1);
				x += offset.x * (column + 1);
				break;
			} case '-x': {
				z -= maxZ * row - offset.z * (row + 1);
				x += offset.x * (column + 1);
				break;
			} case 'z': {
				x += maxX * row + offset.x * (column + 1);
				z += offset.z * (row + 1);
				break;
			} case '-z': {
				x -= maxX * row - offset.x * (row + 1);
				z += offset.z * (row + 1);
				break;
			}
		}
		return { ...ruleSet, ...{ start: new BlockLocation(x, y, z) } };
	}
	subscribe(key) {
		content.warn(`end_plots*${key}*API`);
		eventBuilder.subscribe(`end_plots*${key}*API`, {
			tickAfterLoad: () => {
				players.get().iterate((player) => {
					// content.warn(player.name);
					const { scores, properties, location, memory, rotation } = player;
					let { lastLocation = location, currentPlot, ingorePlotSystem = false } = memory;
					// content.warn({ currentPlot });
					if (!currentPlot) return;
					if (ingorePlotSystem) return;
					const { plotNumberIdentifier, property, teleport, defaultGamemode } = this.plots[currentPlot].rules;
					const { plotOverides: { number: maskedPlotNumber, gamemode: gamemodeOveride = defaultGamemode } = {} } = memory;
					let plotNumber;
					if (isDefined(maskedPlotNumber)) plotNumber = maskedPlotNumber;
					else if (property) plotNumber = properties[plotNumberIdentifier];
					else plotNumber = scores[plotNumberIdentifier];
					// content.warn(plotNumber);
					if (!isDefined(plotNumber)) return;
					const { size, start } = this.getRuleSet(key, plotNumber);
					if (gamemodeOveride) {
						const { gamemode: gamemodePlayer } = player;
						if (gamemodePlayer !== gamemodeOveride) player.gamemode = gamemodeOveride;
					}

					const end = { x: size.x + start.x, y: size.y + start.y, z: size.z + start.z };
					const { x, y, z } = lastLocation;
					content.warn({ lastLocation: objectVector3(lastLocation), start: objectVector3(start), bool1: betweenBlockVector3(location, start, end), bool2: betweenBlockVector3(lastLocation, start, end) });
					memory.lastLocation = location;
					if (betweenBlockVector3(location, start, end)) return;
					if (betweenBlockVector3(lastLocation, start, end)) {
						const { x, y, z } = lastLocation;
						const { x: rx, y: ry } = rotation;
						player.teleport(new Location(x, y, z), overworld, rx, ry);
					} else {
						if (teleport) {
							let { location: teleportLocation, face } = teleport;
							teleportLocation = { location: start, offset: teleportLocation };
							if (isVector3(teleportLocation)) face = { location: start, offset: face };
							const object = { location: teleportLocation, face, dimension: overworld };
							teleportBuilder.teleportOnce(player, object);
						} else {
							const { x: rx, y: ry } = rotation;
							// player.teleport(new Location((size.x) / 2 + start.x, start.y, (size.z) / 2 + start.z), overworld, rx, ry);
						}
					}
				});

			},
			blockBreak: ({ player, block, brokenBlockPermutation }) => {
				const { scores, properties, location, memory, rotation } = player;
				let { currentPlot, ingorePlotSystem = false } = memory;
				if (!currentPlot || ingorePlotSystem) return;
				const { plotNumberIdentifier, property, ruleSets, defaultPermision, defaultGamemode } = this.plots[currentPlot].rules;
				const { plotOverides: { number: numberOveride, permision = defaultPermision, gamemode: gamemodeOveride = defaultGamemode } } = memory;
				let plotNumber;
				if (isDefined(maskedPlotNumber)) plotNumber = numberOveride;
				else if (property) plotNumber = properties[plotNumberIdentifier];
				else plotNumber = scores[plotNumberIdentifier];
				if (!isDefined(plotNumber)) return;
				switch (permision) {
					case 'write': {
						const { size, start } = ruleSets[plotNumber];
						const end = { x: size.x + start.x, y: size.y + start.y, z: size.z + start.z };
						if (betweenBlockVector3(block.location, start, end)) return;
					} case 'read': {
						block.setPermutation(brokenBlockPermutation);
						break;
					}
				}


			},
			beforeItemUseOn: (event) => {
				const { blockFace, blockLocation, source: player, dimension } = event;
				if (!(player instanceof Player)) return;
				const { scores, properties, location, memory, rotation } = player;
				let { currentPlot, ingorePlotSystem = false } = memory;
				if (!currentPlot || ingorePlotSystem) return;
				const { plotNumberIdentifier, property, ruleSets, defaultPermision, defaultGamemode } = this.plots[currentPlot].rules;
				let plotNumber;
				if (isDefined(maskedPlotNumber)) plotNumber = numberOveride;
				else if (property) plotNumber = properties[plotNumberIdentifier];
				else plotNumber = scores[plotNumberIdentifier];
				if (!isDefined(plotNumber)) return;
				switch (permision) {
					case 'write': {
						const { size, start } = ruleSets[plotNumber];
						const end = { x: size.x + start.x, y: size.y + start.y, z: size.z + start.z };
						const blockPlaceLocation = blockFaceToCoords(blockFace, blockLocation);
						if (betweenBlockVector3(blockPlaceLocation, start, end)) return;
					} case 'read': {
						event.cancel = true;
						break;
					}
				}


			}
		});
		this.plots[key].subscribed = true;
	}
	setOveride(player, type, value) {
		const { memory } = player;
		memory[type] = value;
	}
	add(player, key) {
		const { scores, properties } = player;
		const { subscribed } = this.plots[key];
		const { plotNumberIdentifier, property, loop, teleport, structure, ruleSets = [] } = this.plots[key].rules;
		const plots = databases.get('plots*API');
		if (!plots) throw new Error('why does the plots*API db not exist');
		const plot = plots.get(key);
		if (!plot) throw new Error(`plot: ${key}, does not exist`);
		let { availablePlots, currentIndex, hasBeenSubscribed } = plot;
		if (!loop && ruleSets.length === currentIndex) return false;
		const plotNumber = availablePlots.shift();
		if (availablePlots.length === 0) { availablePlots.push(++currentIndex); };

		if (property) properties[plotNumberIdentifier] = plotNumber;
		else scores[plotNumberIdentifier] = plotNumber;
		content.warn({ plotNumber, property, score: scores[plotNumberIdentifier] });
		if (!subscribed) {
			this.subscribe(key);
			hasBeenSubscribed = true;
		}
		const ruleSet = this.getRuleSet(key, plotNumber);
		if (teleport) {
			let { location: teleportLocation, face } = teleport;
			const { start: { x, y, z } } = ruleSet;
			const startLocation = new Location(x, y, z);
			teleportLocation = { location: startLocation, offset: teleportLocation };
			// content.warn(native.stringify(face));
			if (isVector3(face)) face = { location: startLocation, offset: face };
			// content.warn(native.stringify(face));
			teleportBuilder.teleportOnce(player, { location: teleportLocation, face, dimension: overworld });
		}
		if (structure) {
			const { start: { x, y, z } } = ruleSet;
			const { x: sx, y: sy, z: sz } = structure.location;
			structureBuilder.load(Object.assign(structure, { location: new BlockLocation(sx + x, sy + y, sz + z) }));
		}
		plots.set(key, { availablePlots, currentIndex, hasBeenSubscribed });
		content.chatFormat({ databases });
		databases.queueSave('plots*API');
	}
	reset(key) {
		const plots = databases.get('plots*API') ?? databases.add('plots*API');
		plots.set(key, { availablePlots: [0], currentIndex: 0, hasBeenSubscribed: false });
		databases.queueSave('plots*API');
	}
	remove(player, key) {
		const plots = databases.get('plots*API') ?? databases.add('plots*API');
		const { availablePlots = [0], currentIndex = 0, hasBeenSubscribed = false } = plots.get(key);
		const { scores, properties } = player;
		const { plotNumberIdentifier, property, subscribed } = this.plots[key].rules;
		const plotNumber = ((property) ? properties : scores)[plotNumberIdentifier];
		if (!isDefined(plotNumber)) return false;
		if (!availablePlots.includes(plotNumber)) availablePlots.push(plotNumber);
		availablePlots.sort();
		((property) ? properties : scores)[plotNumberIdentifier] = undefined;
		plots.set(key, { availablePlots, currentIndex, hasBeenSubscribed });
		databases.queueSave('plots*API');
		return true;
	}
}
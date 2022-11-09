
import commandBuilder from "../libraries/classes/commands.js";
import errorLogger from "../libraries/classes/error.js";
import propertyBuilder from "../libraries/classes/property.js";
import databases from "../libraries/classes/database.js";
import { overworld, content, assignToPath, native } from "../libraries/utilities.js";
import config from '../config.js';
import eventBuilder from "../libraries/classes/events.js";
const { commandPrefix: prefix } = config;
commandBuilder.register('events', {
    description: "Used to get the Stringified value of events",
    usages: [
        `${prefix}events`,
    ],
    prefix,
    requires: {
        score: {
            staff: 1
        }
    },
    callback: (sender, args) => {
        sender.tellraw(native.stringify(eventBuilder, null, 4));
        // sender.tellraw(JSON.stringify(eventBuilder));
    }
});
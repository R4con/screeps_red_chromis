const SpawningBehaviour = require('spawningBehaviour');

/*
 What it should do:
    - go to the next mine
    - harvest until it dies
    - distribute resources to nearby creeps
 */
class roleHarvester {
    /** @param {Creep} creep **/
    static run(creep) {
        // todo init suicide, if creep to old
        if(creep.ticksToLive < 10) {
            creep.say("💀");
        }

        if (creep.spawning) {
            return;
        }

        if (creep.store.getFreeCapacity() > 0) {
            let errCode = creep.harvest(Game.getObjectById(creep.memory.mine));
            Game.map.visual.clear();

            if (errCode == ERR_NOT_ENOUGH_RESOURCES) {
                creep.say("😴");
            }
            else if (errCode == ERR_NOT_IN_RANGE) {
                creep.moveTo(new RoomPosition(creep.memory.miningSpot.x, creep.memory.miningSpot.y, creep.memory.miningSpot.roomName));
                creep.say("🐢");
            }
            else if (errCode != 0) {
                console.log("other error in Harvester (1): " + errCode);
            }
        }
        else {
            // only do if full

            // is there a collector? If no, bring back resources
            let numMyCollectors = 0;
            for (let pos of creep.room.memory.energySources[creep.memory.mine].availablePositions) {
                if (pos.RoomPosition.x == creep.memory.miningSpot.x && pos.RoomPosition.y == creep.memory.miningSpot.y) {
                    for (let creepName of pos.assignedCreeps) {
                        if (creepName != creep.name) {
                            if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.COLLECTOR) {
                                numMyCollectors ++;
                            }
                        }
                    }
                    break;
                }
            }
            if (numMyCollectors == 0 || creep.pos.getRangeTo(creep.memory.miningSpot.x, creep.memory.miningSpot.y) >= 1) {
                for (let roomSpawnName in Game.spawns) {
                    let roomSpawn = Game.spawns[roomSpawnName];

                    if (roomSpawn.room == creep.room) {
                        let errCode = creep.transfer(roomSpawn, RESOURCE_ENERGY);
                        
                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(roomSpawn);
                            creep.say("🐢");
                        }
                        else if (errCode != 0) {
                            console.log("other error in Harvester (2): " + errCode);
                        }
                        break;
                    }
                }
            }
        }
        
        // todo give resource to collector creeps
    }

    static delete(creepName) {
        for (let roomName in Memory.rooms) {
            for (let sourceId in Memory.rooms[roomName].energySources) {
                for (let pos of Memory.rooms[roomName].energySources[sourceId].availablePositions) {
                    let arrLength = pos.assignedCreeps.length;
                    let index = pos.assignedCreeps.indexOf(creepName);

                    if (index != -1) {
                        // only one mine will be assigned, so when one is removed, its enough.
                        if (index != arrLength) {
                            //swap to last
                            //the last element does not have to be replaced with index, cause it will be poped anyway
                            pos.assignedCreeps[index] = pos.assignedCreeps[arrLength-1];
                        }

                        pos.assignedCreeps.pop()                        
                        return;
                    }
                }
            }
        }

        console.log("did not find " + creepName + " in memory.");
        return;
    }
};

module.exports = roleHarvester;
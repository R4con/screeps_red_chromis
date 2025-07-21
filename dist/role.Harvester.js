const SpawningBehaviour = require('spawningBehaviour').SpawningBehaviour;
const roleCollector = require('role.Collector');

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
            // only mine, if there is space left
            let errCode = creep.harvest(Game.getObjectById(creep.memory.mine));

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
            else {
                // if harvest was OK
                // transfer resources to nearby storages
                roleHarvester.transferEnergyToStorages(creep);
            }
        }
        else {
            // if full, and there is no storage near by, go back yourself
            
            // count assigned Collectors
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

            // is there a collector? If no, bring back resources and store in spawn or extensions
            if (numMyCollectors == 0 || creep.pos.getRangeTo(creep.memory.miningSpot.x, creep.memory.miningSpot.y) >= 1) {
                for (let roomSpawnName in Game.spawns) {
                    let roomSpawn = Game.spawns[roomSpawnName];

                    if (roomSpawn.room == creep.room) {
                        let errCode = creep.transfer(roomSpawn, RESOURCE_ENERGY);
                        
                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(roomSpawn);
                            creep.say("🐢");
                        }
                        else if (errCode == ERR_FULL) {
                            continue;
                        }
                        else if (errCode != 0) {
                            console.log("other error in Harvester (2): " + errCode);
                        }
                        else {
                            if (creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                    }
                }

                let myStructures = creep.room.find(FIND_STRUCTURES);
                let myExtensions = _.filter(myStructures, (element) => element.structureType == STRUCTURE_EXTENSION && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                if (myExtensions != undefined && myExtensions.length > 0) {
                    if (roleCollector.useStorages(creep, myExtensions) == 1) {
                        return;
                    }
                }
            }

            // transfer resources to nearby storages
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                roleHarvester.transferEnergyToStorages(creep);
            }
        }
    }

    static transferEnergyToStorages(creep) {
        // transfer resources to nearby storages
        let nearStructures = creep.pos.findInRange(FIND_STRUCTURES, 2);
        let nearContainers = _.filter(nearStructures, (element) => element.structureType == STRUCTURE_CONTAINER);
        
        if (nearContainers.length > 0) {
            for (let container of nearContainers) {
                if (container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    let error = creep.transfer(container, RESOURCE_ENERGY);

                    if (error != 0) {
                        console.log("error in trasfered energy to container: " + error);
                    }
                    return;
                }
            }
        }

        let nearLinks = _.filter(nearStructures, (element) => element.structureType == STRUCTURE_LINK);
        if (nearLinks.length > 0) {
            for (let link of nearLinks) {
                if (link.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    let error = creep.transfer(link, RESOURCE_ENERGY);
                    if (error != 0) {
                        console.log("error in trasfered energy to link: " + error);
                    }
                    return;
                }
            }
        }

        let nearCreeps = creep.pos.findInRange(FIND_MY_CREEPS , 2);
        let nearCollectors = _.filter(nearCreeps, (element) => element.memory.role == SpawningBehaviour.CREEP_TYPE.COLLECTOR);
        if (nearCollectors.length > 0) {
            for (let collector of nearCollectors) {
                if (collector.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    let error = creep.transfer(collector, RESOURCE_ENERGY);
                    if (error == ERR_NOT_IN_RANGE) {
                        continue;
                    }
                    else if (error == ERR_NOT_ENOUGH_RESOURCES) {
                        // do nothing why does this even happen?
                        continue;
                    }
                    else if (error != 0) {
                        console.log("error in transfer energy to collector: " + error);
                        continue;
                    }
                    else {
                        // everything when well
                        return;
                    }
                }
            }
        }
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
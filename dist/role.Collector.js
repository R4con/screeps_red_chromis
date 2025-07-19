/*
What it should do:
- collect energy from the ground and miners
- collect energy from storage (if nesesarry)
-> put in into spawnwer / extension / Turret / storage

todo collect from every mining creep
*/
class roleCollector {
    /** @param {Creep} creep **/
    static run(creep) {
        // todo init suicide, if creep to old
        if(creep.ticksToLive < 10) {
            creep.say("💀");
        }

        if (creep.spawning) {
            return;
        }

        // collect from miners at that mine and bring back to base
        if (creep.store.getFreeCapacity() > 0 && creep.saying != "🤔") {
            // todo not optimal, will *only* transfer to storage, when full
            // go to miner, and get energy
            let rangeToCollector = creep.pos.getRangeTo(creep.memory.collectorSpot.x, creep.memory.collectorSpot.y);
            
            if (rangeToCollector <= 1) {
                // collect from creep
                let objectsAtPos = creep.room.lookAt(creep.memory.collectorSpot.x, creep.memory.collectorSpot.y);
                let harvesterCreep = objectsAtPos.find((element) => element.type == "creep");

                if (harvesterCreep != undefined) {
                    harvesterCreep.creep.transfer(creep, RESOURCE_ENERGY);
                }
                else {
                    // wait for creep
                    return;
                }
            }
            else {
                creep.moveTo(creep.memory.collectorSpot.x, creep.memory.collectorSpot.y);
            }
        }
        else {
            // move back and store energy somewhere
            let mySpawns = creep.room.find(FIND_MY_SPAWNS);
            let myStructures = creep.room.find(FIND_STRUCTURES);

            // todo filter out unimportant stuff from myStructures, so the search is quicker
            let myStorages = _.filter(myStructures,(element) => element.structureType == STRUCTURE_STORAGE);
            let myExtensions = _.filter(myStructures,(element) => element.structureType == STRUCTURE_EXTENSION);
            let myContainers = _.filter(myStructures,(element) => element.structureType == STRUCTURE_CONTAINER);

            //console.log("1: " + myStorages + " 2: " + myExtensions + " 3: " + myContainers + " " + myContainers.length );

            for (let spawn of mySpawns) {
                if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    let errCode = creep.transfer(spawn, RESOURCE_ENERGY);
                    
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(spawn);
                        if (creep.saying == "🤔" && creep.store.getUsedCapacity() > 0) {
                            creep.say("🤔");
                        }
                        return;
                    }
                    else if (errCode == ERR_FULL) {
                        // look for other storages
                        console.log("go to other storage 1");
                        continue;
                    }
                    else if (errCode == ERR_NOT_ENOUGH_ENERGY) {
                        return;
                    }
                    else if (errCode != 0) {
                        console.log("other error in Collector (1): " + errCode);
                    }
                    else {
                        // all good, transfer worked
                        if (creep.store.getUsedCapacity() > 0) {
                            creep.say("🤔");
                        }
                        return;
                    }
                }
            }
            // todo put these in a function
            if (myExtensions != undefined && myExtensions.length > 0) {
                for (let extension of myExtensions) {
                    if (extension.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        let errCode = creep.transfer(extension, RESOURCE_ENERGY);

                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(extension);
                            if (creep.saying == "🤔" && creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                        else if (errCode != 0) {
                            console.log("other error in Collector (3): " + errCode);
                        }
                        else {
                            // all good, transfer worked
                            if (creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                    }
                }
            }

            if (myStorages != undefined && myStorages.length > 0) {
                for (let storage of myStorages) {
                    if (storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        let errCode = creep.transfer(storage, RESOURCE_ENERGY);

                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage);
                            if (creep.saying == "🤔" && creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                        else if (errCode != 0) {
                            console.log("other error in Collector (2): " + errCode);
                        }
                        else {
                            // all good, transfer worked
                            if (creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                    }
                }
            }

            if (myContainers != undefined && myContainers.length > 0) {    // && myContainer[RESOURCE_ENERGY] != undefined
                for (let container of myContainers) {
                    if (container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        let errCode = creep.transfer(container, RESOURCE_ENERGY);

                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                            if (creep.saying == "🤔" && creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                        else if (errCode != 0) {
                            console.log("other error in Collector (2): " + errCode);
                        }
                        else {
                            // all good, transfer worked
                            if (creep.store.getUsedCapacity() > 0) {
                                creep.say("🤔");
                            }
                            return;
                        }
                    }
                }
            }

            // if nothing else has been done, go to spawn (returns before this in every other case)
            //creep.moveTo(mySpawns[0]);
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
        return;
    }
};

module.exports = roleCollector;
/*
What it should do:
- collect energy from the ground and miners
- collect energy from storage (if nesesarry)
-> put in into spawnwer / extension / Turret / storage
*/
class roleCollector {
    /** @param {Creep} creep **/
    static run(creep) {
        // todo init suicide, if creep to old
        if(creep.ticksToLive < 50) {
            creep.say("💀");
        }

        if (creep.spawning) {
            return;
        }

        // collect dropped energy, if nearby and enough
        let droppedEnergyPiles = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 5, (element) => 
            element.resourceType == RESOURCE_ENERGY && 
            element.amount > 200
        );
        let closestEnergyPile = undefined;
        if (droppedEnergyPiles.length > 0) {
            closestEnergyPile = creep.pos.findClosestByRange(droppedEnergyPiles);
        }
        
        if (closestEnergyPile != undefined && creep.store.getFreeCapacity() > 0 && creep.saying != "🤔" && closestEnergyPile.amount > 200) {
            creep.say("⚡");

            // goto pile, and collect it
            let errCode = creep.pickup(closestEnergyPile);

            if (errCode == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestEnergyPile);
            }
            else if (errCode != 0) {
                console.log("other error in Collector (energyPile): " + errCode);
            }
            return;
        }

        let deadCreep = creep.pos.findInRange(FIND_TOMBSTONES, 5, (element) => 
            element.store != undefined &&
            element.store.getUsedCapacity(RESOURCE_ENERGY) > 200
        );
        let destroyedStructures = creep.pos.findInRange(FIND_RUINS, 5, (element) => 
            element.store != undefined &&
            element.store.getUsedCapacity(RESOURCE_ENERGY) > 200
        );
        let closestDeadStore = undefined;
        if (deadCreep.length > 0) {
            closestDeadStore = creep.pos.findClosestByRange(deadCreep);
        }
        else if (destroyedStructures.length > 0) {
            closestDeadStore = creep.pos.findClosestByRange(destroyedStructures);
        }
        if (closestDeadStore != undefined && creep.store.getFreeCapacity() > 0 && creep.saying != "🤔" && closestDeadStore.store.getUsedCapacity(RESOURCE_ENERGY) > 200) {
            creep.say("⚒️");

            // goto destroyed store object, and collect its resources
            let errCode = creep.withdraw(closestDeadStore, RESOURCE_ENERGY);

            if (errCode == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestDeadStore);
            }
            else if (errCode == ERR_NOT_ENOUGH_RESOURCES) {
                // idk why this happens
            }
            else if (errCode != 0) {
                console.log("other error in Collector (Tomb/Ruin): " + errCode);
            }
            return;
        }
        
        // collect from miners at that mine and bring back to base
        if (creep.store.getFreeCapacity() > 0 && creep.saying != "🤔") {
            // todo not optimal, will *only* transfer to storage, when full
            // go to miner, and get energy
            let rangeToCollector = creep.pos.getRangeTo(creep.memory.collectorSpot.x, creep.memory.collectorSpot.y);
            
            if (rangeToCollector <= 1) {
                // wait and get the resources
                // todo get resources from nearby storage
            }
            else {
                creep.moveTo(creep.memory.collectorSpot.x, creep.memory.collectorSpot.y);
            }
        }
        else {
            // move back and store energy somewhere
            let mySpawns = creep.room.find(FIND_MY_SPAWNS);
            let myStructures = creep.room.find(FIND_STRUCTURES);

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
            
            
            let myExtensions = _.filter(myStructures,(element) => element.structureType == STRUCTURE_EXTENSION && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            if (myExtensions != undefined && myExtensions.length > 0) {
                if (roleCollector.useStorages(creep, myExtensions) == 1) {
                    return;
                }
            }

            // todo filter out unimportant stuff from myStructures, so the search is quicker
            let myStorages = _.filter(myStructures,(element) => element.structureType == STRUCTURE_STORAGE && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            if (myStorages != undefined && myStorages.length > 0) {
                if (roleCollector.useStorages(creep, myStorages) == 1) {
                    return;
                }
            }

            let myTowers = _.filter(myStructures, (element) => element.structureType == STRUCTURE_TOWER && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            if (myTowers != undefined && myTowers.length > 0) {
                if (roleCollector.useStorages(creep, myTowers) == 1) {
                    return;
                }
            }

            let myContainers = _.filter(myStructures,(element) => element.structureType == STRUCTURE_CONTAINER && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            if (myContainers != undefined && myContainers.length > 0) {    // && myContainer[RESOURCE_ENERGY] != undefined
                if (roleCollector.useStorages(creep, myContainers) == 1) {
                    return;
                }
            }

            // if nothing else has been done, go to spawn (returns before this in every other case)
            //creep.moveTo(mySpawns[0]);
        }
    }
    
    static useStorages(creep, storageContainers) {
        // do this before let storageContainers = _.filter(myStructures,(element) => element.structureType == STRUCTURE_CONTAINER && element.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        let container = creep.pos.findClosestByRange(storageContainers);

        //for (let container of storageContainers) {
        let errCode = creep.transfer(container, RESOURCE_ENERGY);

        if (errCode == ERR_NOT_IN_RANGE) {
            creep.moveTo(container);
            if (creep.saying == "🤔" && creep.store.getUsedCapacity() > 0) {
                creep.say("🤔");
            }
            return 1;
        }
        else if (errCode == ERR_NOT_ENOUGH_RESOURCES) {
            // idk, why this happens, but it is not a big issue
            return 1;
        }
        else if (errCode != OK) {
            console.log("other error in Collector (2): " + errCode);
        }
        else {
            // all good, transfer worked
            if (creep.store.getUsedCapacity() > 0) {
                creep.say("🤔");
            }
            return 1;
        }
        //}
        return 0;
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
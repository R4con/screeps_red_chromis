/*
 What it should do:
    - go to the next mine
    - harvest until it dies
    - distribute resources to nearby creeps
 */
class roleWorker {
    /** @param {Creep} creep **/
    static run(creep) {
        if(creep.ticksToLive < 30) {
            creep.say("💀");

            if (creep.store.getUsedCapacity() == 0) {
                creep.suicide();
                // todo delete creep here
                return;
            }

            // goto storage and put resources inside
            let myStructures = creep.room.find(FIND_STRUCTURES);
            let myStorages = _.filter(myStructures,(element) => element.structureType == STRUCTURE_STORAGE);
            let myContainers = _.filter(myStructures,(element) => element.structureType == STRUCTURE_CONTAINER);

            if (myStorages != undefined && myStorages.length > 0) {
                for (let storage of myStorages) {
                    if (storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        let errCode = creep.transfer(storage, RESOURCE_ENERGY);

                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(storage);
                        }
                        else if (errCode != 0) {
                            console.log("other error in Collector (2): " + errCode);
                        }
                        return;
                    }
                }
            }

            if (myContainers != undefined && myContainers.length > 0) {    // && myContainer[RESOURCE_ENERGY] != undefined
                for (let container of myContainers) {
                    if (container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        let errCode = creep.transfer(container, RESOURCE_ENERGY);

                        if (errCode == ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                        }
                        else if (errCode != 0) {
                            console.log("other error in Collector (2): " + errCode);
                        }
                        return;
                    }
                }
            }

            return;
        }

        if (creep.spawning) {
            return;
        }

        // sign controller
        let signMessage = "Hello World, new player here :)"
        if (creep.room.controller.sign == undefined || creep.room.controller.sign.text != signMessage) {
            let errCode = creep.signController(creep.room.controller, signMessage);

            if (errCode == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
                return;
            }
            else if (errCode != 0) {
                console.log("other error in Worker (1): " + errCode);
                return;
            }
        }

        if (creep.store.getUsedCapacity() == 0) {
            // goto a storage
            let myStructures = creep.room.find(FIND_STRUCTURES);
            let myContainers = _.filter(myStructures,(element) => element.structureType == STRUCTURE_CONTAINER);
            let myStorages = _.filter(myStructures,(element) => element.structureType == STRUCTURE_STORAGE);
            let myLinks = _.filter(myStructures,(element) => element.structureType == STRUCTURE_LINK);

            if (myStorages != undefined && myStorages.length > 0) {
                let closestStorage = creep.pos.findClosestByRange(myStorages);
                
                // only go there, if there is energy inside
                if (closestStorage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    let errCode = creep.withdraw(closestStorage, RESOURCE_ENERGY);
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestStorage);
                    }
                    else if (errCode == ERR_NOT_ENOUGH_ENERGY) {
                        // todo 
                    }
                    else if (errCode != 0) {
                        console.log("other error in Worker (1): " + errCode);
                    }
                }
                return;
            }
            else if (myLinks != undefined && myLinks.length > 0) {
                let closestLink = creep.pos.findClosestByRange(myLinks);
                
                // only go there, if there is energy inside
                if (closestLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    let errCode = creep.withdraw(closestLink, RESOURCE_ENERGY);
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestLink);
                    }
                    else if (errCode == ERR_NOT_ENOUGH_ENERGY) {
                        // todo
                    }
                    else if (errCode != 0) {
                        console.log("other error in Worker (2): " + errCode);
                    }
                }
                return;
            }
            else if (myContainers != undefined && myContainers.length > 0) {
                let closestContainer = creep.pos.findClosestByRange(myContainers);
                
                // only go there, if there is energy inside
                if (closestContainer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    let errCode = creep.withdraw(closestContainer, RESOURCE_ENERGY);
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestContainer);
                    }
                    else if (errCode == ERR_NOT_ENOUGH_ENERGY) {
                        // todo
                    }
                    else if (errCode != 0) {
                        console.log("other error in Worker (3): " + errCode);
                    }
                }
                return;
            }
            else {
                // goto spawn and get energy
                // do only pull from spawn, if spawn is full for more than one tick => so nothing more to spawn.
                let mySpawns = creep.room.find(FIND_MY_SPAWNS);
                // todo move to container, before saying "💰"
                if (creep.pos.getRangeTo(mySpawns[0].pos) > 1 || creep.saying == "💰") {
                    let errCode = creep.withdraw(mySpawns[0], RESOURCE_ENERGY);
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(mySpawns[0]);
                    }
                    else if (errCode == ERR_NOT_ENOUGH_ENERGY) {
                        // sleep if Spawn is full
                    }
                    else if (errCode != 0) {
                        console.log("other error in Worker (3): " + errCode);
                    }
                }
                else if (mySpawns[0].store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    creep.say("💰");
                }
            }
            return;
        }
        else {
            // do something with the energy
            // prevent controller from downgrading
            if (creep.room.controller != undefined && (creep.room.controller.ticksToDowngrade < 1000)) {
                let errCode = creep.upgradeController(creep.room.controller, RESOURCE_ENERGY);
                if (errCode == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
                else if (errCode != 0) {
                    console.log("other error in Worker (6_1): " + errCode);
                }
                return;
            }

            //repair structures
            // todo add target to memory, so it gets repaired to 90% or something, and not just 50%.
            let repairTargets = creep.room.find(FIND_STRUCTURES, {
                filter: object => object.hits < object.hitsMax*0.5
            });
            
            if (repairTargets.length > 0) {
                let targetList = repairTargets.sort((a,b) => (a.hits - b.hits)).slice(0,6);   //of the 6 with the lowest hitpoints
                let target = creep.pos.findClosestByRange(targetList);                      //choose the closest one

                if(target != undefined) {
                    let errCode = creep.repair(target);
                    if (errCode == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                    else if (errCode != 0) {
                        console.log("other error in Worker (5): " + errCode);
                    }
                    return;
                }
            }

            // build structures
            let constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
            if (constructionSites != undefined && constructionSites.length > 0) {
                let closestSite = creep.pos.findClosestByRange(constructionSites);

                let errCode = creep.build(closestSite);
                if (errCode == ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestSite);
                }
                else if (errCode != 0) {
                    console.log("other error in Worker (4): " + errCode);
                }
                return;
            }

            // if nothing else to do, upgrade controller
            if (creep.room.controller != undefined && creep.room.controller.level < creep.room.memory.building.desiredRoomLevel) {
                let errCode = creep.upgradeController(creep.room.controller, RESOURCE_ENERGY);
                if (errCode == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
                else if (errCode != 0) {
                    console.log("other error in Worker (6_1): " + errCode);
                }
                return;
            }
        }
    }

    static delete(creepName) {
        // nothing to do here
        return;
    }
};

module.exports = roleWorker;
/*
 What it should do:
    - determine, what creep to spawn
 */

class SpawningBehaviour {
    static CREEP_TYPE = Object.freeze({
        DEFAULT: "default",
        HARVESTER: "harvester",
        COLLECTOR: "collector",
        WORKER: "worker",
        DEFENDER: "defender",
    });

    static BODYPART_COST = Object.freeze({ 
        "move": 50, "work": 100, "attack": 80, "carry": 50,
        "heal": 250, "ranged_attack": 150, "tough": 10, "claim": 600 
    });


    static getCreepBody(energyAvailable, creepRole) {
        // max speed = half of body is move
        let finishedBody = [];

        switch (creepRole) {
            case SpawningBehaviour.CREEP_TYPE.HARVESTER: {
                for (let i=0; i<Math.floor(energyAvailable / 500) +1; i++) {
                    energyAvailable -= SpawningBehaviour.BODYPART_COST["carry"];  // for the single carry part in every worker
                }
                // 50% work, 25% move
                let numWorkParts =  Math.floor((energyAvailable * 0.8) / 100);
                let numMoveParts = Math.floor((energyAvailable * 0.2) / 50);
                
                while (numWorkParts > 0) {
                    finishedBody.push("work");
                    energyAvailable -= SpawningBehaviour.BODYPART_COST["work"];
                    numWorkParts --;
                }
                
                // add a single carry part
                finishedBody.push("carry");


                while (numMoveParts > 0) {
                    finishedBody.push("move");
                    energyAvailable -= SpawningBehaviour.BODYPART_COST["move"];
                    numMoveParts --;
                }

                // fill up, if there is still unused energy
                while (energyAvailable > (SpawningBehaviour.BODYPART_COST["carry"] + SpawningBehaviour.BODYPART_COST["move"])) {
                    finishedBody.push("carry");
                    finishedBody.push("move");
                    energyAvailable -= SpawningBehaviour.BODYPART_COST["carry"] + SpawningBehaviour.BODYPART_COST["move"];
                }
                if (energyAvailable > SpawningBehaviour.BODYPART_COST["move"]) {
                    finishedBody.push("move");
                    energyAvailable -= SpawningBehaviour.BODYPART_COST["move"];
                }

                break;
            }
            case SpawningBehaviour.CREEP_TYPE.COLLECTOR: {
                // determine how many "carry"-"move" packets can be used
                let maxParts = Math.floor(energyAvailable / 100);

                for (let i=0; i<maxParts; i++){
                    finishedBody.push("carry");
                }
                for (let i=0; i<maxParts; i++){
                    finishedBody.push("move");
                }
                break;
            }
            case SpawningBehaviour.CREEP_TYPE.WORKER: {
                // same amount of work, carry and move parts.
                let maxParts = Math.floor((energyAvailable / 2) / 100);
                
                for (let i=0; i<maxParts; i++){
                    finishedBody.push("work");
                }
                for (let i=0; i<maxParts; i++){
                    finishedBody.push("carry");
                }
                for (let i=0; i<maxParts; i++){
                    finishedBody.push("move");
                }
                break;
            }
            case SpawningBehaviour.CREEP_TYPE.DEFENDER: {
                // todo code this
                if (energyAvailable >= 300) {
                    finishedBody += ["attack", "attack", "move", "move"];
                }
                break;
            }
            default: {
                // return basic creep
                if (energyAvailable >= 300) {
                    finishedBody += ["work", "carry", "carry", "move", "move"];
                }
                break;
            }
        }
        return finishedBody;
    }

    static createCreep(spawn, creepRole, addMemory) {
        let availableEnergy = spawn.room.energyAvailable;

        let creepBody = this.getCreepBody(availableEnergy, creepRole);
        let creepName = creepRole + "_" + Game.time;
        let creepMemory = {role: creepRole, ...addMemory};

        let errCode = spawn.spawnCreep(creepBody, creepName, {memory: creepMemory, directions: [TOP, LEFT, RIGHT, BOTTOM, TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT]});
        if (errCode > 0) {
            console.log("error Code while spawning creep: " + errCode);
        }
        return creepName;
    }

    static run(spawn) {
        // what has to happen?
        // - every mine should at least have one miner
        // - every mine should at least have one collector
        // - add a few upgraders at some point (upgrade mode?)
        // - add more miners and collectors

        if (!spawn.isActive || spawn.spawning) {
            return;
        }

        // count active creeps:
        // only necesarry for Worker
        let roomCreepCount = {
            DEFAULT : 0,
            HARVESTER : 0,
            COLLECTOR : 0,
            WORKER : 0,
            DEFENDER : 0,
        }
        for (let creepName in Game.creeps) {
            let creep = Game.creeps[creepName]
            switch (creep.memory.role) {
                case "harvester":
                    roomCreepCount.HARVESTER ++;
                    break;
                case "collector":
                    roomCreepCount.COLLECTOR ++;
                    break;
                case "default":
                    roomCreepCount.DEFAULT ++;
                    break;
                case "worker":
                    roomCreepCount.WORKER ++;
                    break;
                case "defender":
                    roomCreepCount.WORKER ++;
                    break;
                default:
                    console.log("found creep without role: " + creep.name);
                    break;
            }
        }

        if (spawn.room.energyAvailable != spawn.room.energyCapacityAvailable && roomCreepCount.HARVESTER != 0) {
            return;
        }

        if (roomCreepCount.DEFENDER < 2 && spawn.room.find(FIND_HOSTILE_CREEPS).length > 0) {
            console.log("Defend me!");
            this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.DEFENDER, {});
            return;
        }

        // count creeps at mines
        let creepsAtMines = {}
        for (let sourceId in spawn.room.memory.energySources) {
            let availablePositions = spawn.room.memory.energySources[sourceId].availablePositions;

            creepsAtMines[sourceId] = {
                numHarvester: 0,
                numCollectors: 0,
            };
            
            for (let pos of availablePositions) {
                for (let creepName of pos.assignedCreeps) {
                    if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.HARVESTER) {
                        creepsAtMines[sourceId].numHarvester ++;
                    }
                    else if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.COLLECTOR) {
                        creepsAtMines[sourceId].numCollectors ++;
                    }
                }
            }
        }

        for(let flag = 0; flag < 6; flag ++){
            for (let sourceId in creepsAtMines) {
                let creepCount = creepsAtMines[sourceId];
                let availablePositions = spawn.room.memory.energySources[sourceId].availablePositions;

                if (flag == 0 && creepCount.numHarvester == 0) {
                    console.log("flag 0");
                    // spawn miner for unused mine, and put it in the first Position, sice all are free
                    let memory = {
                        miningSpot: availablePositions[0].RoomPosition, 
                        mine: sourceId
                    };
                    let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.HARVESTER, memory);
                    availablePositions[0].assignedCreeps.push(creepName);
                    
                    // a creep will be spawned, so done here.
                    return;
                }

                if (flag == 1 && creepCount.numCollectors == 0) {   // numHarvester always > 0 here
                    console.log("flag 1");
                    // determine, which spot to pick
                    // todo it does not work well right now. Always picks the first one.
                    for (let pos of availablePositions) {
                        for (let creepName of pos.assignedCreeps) {
                            if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.HARVESTER) {
                                // spawn new collector for this spot
                                let memory = {
                                    collectorSpot: pos.RoomPosition,
                                    mine: sourceId
                                };
                                let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.COLLECTOR, memory);
                                pos.assignedCreeps.push(creepName);
            
                                return;
                            }
                        }
                    }
                }

                // check if there are any workers
                if (flag == 2 && roomCreepCount.WORKER == 0) {
                    console.log("flag worker");
                    // spawn worker
                    let memory = {};
                    let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.WORKER, memory);
                    
                    // a creep will be spawned, so done here.
                    return;
                }

                if (flag == 3 && creepCount.numCollectors < creepCount.numHarvester) {
                    console.log("flag 2");

                    for (let pos of availablePositions) {
                        let harversterCount = 0;
                        let collectorCount = 0;

                        for (let creepName of pos.assignedCreeps) {
                            console.log(creepName + " " + Game.creeps[creepName].memory.role);
                            if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.HARVESTER) {
                                harversterCount ++;
                            }
                            else if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.COLLECTOR) {
                                collectorCount ++;
                            }
                        }

                        if (collectorCount < harversterCount) {
                            // spawn new collector for this spot
                            let memory = {
                                collectorSpot: pos.RoomPosition,
                                mine: sourceId
                            };
                            let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.COLLECTOR, memory);
                            pos.assignedCreeps.push(creepName);
        
                            return;
                        }
                    }
                }

                if (flag == 4 && creepCount.numHarvester < spawn.room.memory.energySources[sourceId].availablePositions.length) {
                    console.log("flag 3");

                    // get available position without a harvester in it
                    for (let pos of availablePositions) {
                        let har_flag = 0;
                        for (let creepName of pos.assignedCreeps) {
                            if (Game.creeps[creepName].memory.role == SpawningBehaviour.CREEP_TYPE.HARVESTER) {
                                har_flag ++;
                            }
                        }

                        // if no harvester at that position, put a harvester there
                        if (har_flag == 0) {
                            let memory = {
                                miningSpot: pos.RoomPosition,
                                mine: sourceId
                            };
                            let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.HARVESTER, memory);
                            pos.assignedCreeps.push(creepName);
        
                            return
                        }
                    }
                }
                
                // todo change this, to if(enough enery income)
                if (flag == 5 && roomCreepCount.WORKER < 3) {
                    console.log("flag worker");
                    // spawn worker
                    let memory = {};
                    let creepName = this.createCreep(spawn, SpawningBehaviour.CREEP_TYPE.WORKER, memory);
                    
                    // a creep will be spawned, so done here.
                    return;
                }
            }
        }
    }
};

module.exports = {SpawningBehaviour}; 
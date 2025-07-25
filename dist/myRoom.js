// define building blocks
const BUILDINGS = {
    extension5x5 : [
        {x: 0,y: 0, structure:STRUCTURE_EXTENSION},
        {x: 1,y: 0, structure:STRUCTURE_EXTENSION},
        {x:-1,y: 0, structure:STRUCTURE_EXTENSION},
        {x: 0,y: 1, structure:STRUCTURE_EXTENSION},
        {x: 0,y:-1, structure:STRUCTURE_EXTENSION},
        {x:-2,y: 0, structure:STRUCTURE_ROAD},
        {x:-1,y:-1, structure:STRUCTURE_ROAD},
        {x: 0,y:-2, structure:STRUCTURE_ROAD},
        {x: 1,y:-1, structure:STRUCTURE_ROAD},
        {x: 2,y: 0, structure:STRUCTURE_ROAD},
        {x: 1,y: 1, structure:STRUCTURE_ROAD},
        {x: 0,y: 2, structure:STRUCTURE_ROAD},
        {x:-1,y: 1, structure:STRUCTURE_ROAD},
    ],
};

class MyRoom {

    /** @param {Source} energySource **/
    static findMiningSpots(energySource) {
        let availablePositions = []

        for (let x=-1; x<=1; x++){
            for (let y=-1; y<=1; y++){
                let terrain = energySource.room.getTerrain().get(energySource.pos.x + x, energySource.pos.y + y);
                if (terrain == 0 || terrain == 2) { // 0 = nothing, 1 = wall, 2 = Swamp
                    availablePositions.push(new RoomPosition(energySource.pos.x + x, energySource.pos.y + y, energySource.room.name))
                }
            }
        }

        return availablePositions;
    }

    /** @param {Room} room **/
    static init(room) {
        let sources = room.find(FIND_SOURCES);

        if (sources == []) {
            console.log("no energy sources found in room: " + room.name);
            return;
        }

        room.memory["energySources"] = {}

        for(var energySource of sources) {
            let availablePositions = this.findMiningSpots(energySource)

            if (room.memory.energySources[energySource.id] == undefined) {
                room.memory.energySources[energySource.id] = {};
            }
            if (room.memory.energySources[energySource.id].availablePositions == undefined) {
                room.memory.energySources[energySource.id]["availablePositions"] = [];
            }

            for(var pos of availablePositions) {
                room.memory.energySources[energySource.id].availablePositions.push({"RoomPosition" : pos, "assignedCreeps" : []}); //JSON.stringify(pos)
            }
        }

        room.memory["building"] = {
            desiredRoomLevel : 2,   // the maximum room level, the controller should have
            buildQueue : [],        // contains buildings, that should be build next (only one is build at a time)
            finishedBuildings : [], // conatins finished buildings, that should be rebuild, when destroyed.
            buildingStage : 0,    // is equal to the rcl, when buildings have been queued.
            rangeChecked : 2,       // range checked for expansion building, starting value (default:2)
        }

        room.memory["isInitialized"] = true;
    }

    static pushBuildQueue(room, newBuilding) {
        if (room.lookForAt(LOOK_CONSTRUCTION_SITES, newBuilding.x, newBuilding.y).length == 0 && 
            (room.lookForAt(LOOK_STRUCTURES, newBuilding.x, newBuilding.y).length == 0 || room.lookForAt(LOOK_RUINS, newBuilding.x, newBuilding.y).length > 0) && 
            room.memory.building.buildQueue.find((element) => element.x == newBuilding.x && element.y == newBuilding.y) == undefined) {
            
            // insert new positions in front, 'cause the last ones are build first
            room.memory.building.buildQueue = [{x:newBuilding.x, y:newBuilding.y, structure:newBuilding.structure}].concat(room.memory.building.buildQueue);
        }
    }

    static checkBuildLocation(room, x, y, builds) {
        let score = 0;

        for (let building of builds) {
            let structuresAt = room.lookAt(x+building.x, y+building.y);
            let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
            let structures = _.filter(structuresAt,(element) => element.type == 'structure');
            let roads = _.filter(structures,(element) => element.structure.structureType == STRUCTURE_ROAD);
            let walls = _.filter(structuresAt,(element) => element.type == 'terrain' && element.terrain == 'wall');
            let constructionSite = _.filter(constructionSites,(element) => element.pos.x == x+building.x && element.pos.y == y+building.y);
            let queuedBuild = room.memory.building.buildQueue.find((element) => element.x == (x+building.x) && element.y == (y+building.y));     //undefined == nothing in queue

            if (walls.length == 0 && structures.length == 0 && constructionSite.length == 0 && queuedBuild == undefined) {
                // spot is free, check next
                continue;
            }
            else {
                // building spot is not free? Can you build over a road?
                if (building.structure == STRUCTURE_ROAD && roads.length > 0 ) {
                    // can build over Roads.
                    score ++;
                    continue;
                }
                else {
                    // a spot for a structure is blocked by something.
                    return -1;
                }
            }
        }

        if (score > 0) {
            // todo use base center coords instead of this
            score += room.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(x,y);
        }

        // < 0 == false
        return score;
    }

    static placeBuildingAround(room, x, y, building) {
        for (let distance = 1; distance < 8; distance++) {
            for (let dx=-distance; dx<=distance; dx++) {
                for (let dy=-distance; dy<=distance; dy++) {
                    if (Math.abs(dy) < distance && Math.abs(dx) < distance) {continue;}

                    let structuresAt = room.lookAt(x+dx, y+dy);
                    let structures = _.filter(structuresAt,(element) => element.type == 'structure');
                    let walls = _.filter(structuresAt,(element) => element.type == 'terrain' && element.terrain == 'wall');
                    let queuedBuild = room.memory.building.buildQueue.find((element) => element.x == (x+dx) && element.y == (y+dy));     //undefined == nothing in queue

                    if (walls.length == 0 && structures.length == 0 && queuedBuild == undefined) {
                        // spot is free, check next
                        this.pushBuildQueue(room, {x:x+dx, y:y+dy, structure:building});
                        return;
                    }
                    else {
                        // a spot for a structure is blocked by something.
                        continue;
                    }
                }
            }
        }
    }

    static destroyBuilding(room, building) {
        building.destroy();

        // delete from finished buildings
        room.memory.building.finishedBuildings = room.memory.building.finishedBuildings.filter((element) => element.x != building.pos.x || element.y != building.pos.y || element.structure != building.structureType);
        console.log("Deleted Building: " + building.structureType + " at x:" + building.pos.x + " y:" + building.pos.y);
    }

    /** @param {Room} room **/
    static build(room) {
        // determine, what to build next, and build construction sites there
        // define stamps for the spawn square, and a expansion square
        // determine where to build roads maybe from spawn to mines and room controller?
        let rcl = room.controller.level;

        if (room.memory.building.buildQueue.length > 0) {  //? && rcl < 2 => skip for now, to allow testing
            // build next building from queue first
            let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites != undefined && constructionSites.length == 0) {
                // build next building in queue
                let newBuilding = room.memory.building.buildQueue[room.memory.building.buildQueue.length-1];

                let errCode = room.createConstructionSite(newBuilding.x, newBuilding.y, newBuilding.structure);
                
                if (errCode == ERR_INVALID_TARGET) {
                    console.log(`already a building at that spot. Removing ${newBuilding.structure} at {x:${newBuilding.x}, y:${newBuilding.y}}`);
                    room.memory.building.buildQueue.pop();
                }
                else if (errCode == ERR_RCL_NOT_ENOUGH) {
                    console.log("RCL to low to build: " + newBuilding.structure);
                }
                else if (errCode == -10) {
                    console.log("error in MyRoom.build: " + errCode + " " + newBuilding.structure);
                    console.log("x: " + newBuilding.x + " y:" + newBuilding.y + " struc:" + newBuilding.structure);
                }
                else if (errCode != 0) {
                    console.log("error in MyRoom.build: " + errCode + " " + newBuilding.structure);
                }
                else {
                    // only remove, if contruction site was build
                    // add to finished buildings after that
                    room.memory.building.finishedBuildings.push(newBuilding);
                    room.memory.building.buildQueue.pop();
                }
            }
            return;
        } else if (room.memory.building.buildQueue.length == 0 
            && room.controller.level == room.memory.building.desiredRoomLevel 
            && room.controller.ticksToDowngrade <= 9000 //spawns with 10k ticks, when just upgraded, and will not be maintained until <5k ticks
            && room.controller.level < 8) {
            // todo check room rcl should be upgraded
            console.log("ready to upgrade rcl");
            room.memory.building.desiredRoomLevel += 1;
        }

        // build roads
        let sources = room.find(FIND_SOURCES);
        let spawn = room.find(FIND_MY_SPAWNS)[0];      
        
        // check if a building got destroyed, add to build queue, if it was
        for (let finishedBuilding of room.memory.building.finishedBuildings) {
            let structuresAt = room.lookForAt(LOOK_STRUCTURES, finishedBuilding.x, finishedBuilding.y);
            let constructionSiteAt = room.lookForAt(LOOK_CONSTRUCTION_SITES, finishedBuilding.x, finishedBuilding.y);

            // todo index [0] does only work, when there is only a single structure per tile
            if ((structuresAt.length == 0 || structuresAt[0].structureType != finishedBuilding.structure) && constructionSiteAt.length == 0) {
                //console.log(finishedBuilding.structure, JSON.stringify(structuresAt));
                console.log("Building got destroyed at x:" + finishedBuilding.x + " y:" + finishedBuilding.y + "! The " + finishedBuilding.structure + " has to be rebuild.");
                this.pushBuildQueue(room, {x:finishedBuilding.x, y:finishedBuilding.y, structure:finishedBuilding.structure});
            }
        }


        // build structures depending on level
        if (rcl >= 1 && room.memory.building.buildingStage == 0) {
            // only build the few roads around the spawn
            let desiredBuildings = [];

            //desiredBuildings.push({x:spawn.pos.x-2, y:spawn.pos.y+1, structure:STRUCTURE_ROAD});
            //desiredBuildings.push({x:spawn.pos.x+2, y:spawn.pos.y+1, structure:STRUCTURE_ROAD});
            //desiredBuildings.push({x:spawn.pos.x-2, y:spawn.pos.y-3, structure:STRUCTURE_ROAD});
            //desiredBuildings.push({x:spawn.pos.x+2, y:spawn.pos.y-3, structure:STRUCTURE_ROAD});

            desiredBuildings.push({x:spawn.pos.x,   y:spawn.pos.y-1, structure:STRUCTURE_ROAD});

            desiredBuildings.push({x:spawn.pos.x-1, y:spawn.pos.y,   structure:STRUCTURE_ROAD});
            desiredBuildings.push({x:spawn.pos.x+1, y:spawn.pos.y,   structure:STRUCTURE_ROAD});
            desiredBuildings.push({x:spawn.pos.x-1, y:spawn.pos.y-2, structure:STRUCTURE_ROAD});
            desiredBuildings.push({x:spawn.pos.x+1, y:spawn.pos.y-2, structure:STRUCTURE_ROAD});

            for (let location of desiredBuildings) {
                this.pushBuildQueue(room, location);
            }
            // finished queueing this building step.
            console.log("Queued buildings for stage 1");
            room.memory.building.buildingStage = 1;
        }
        else if (rcl >= 2 && room.memory.building.buildingStage == 1) {
            // build storage container
            this.placeBuildingAround(room, spawn.pos.x, spawn.pos.y-1, STRUCTURE_CONTAINER)

            // build road to sources and controller
            // todo when a road gets build on top of another, silce(2) removes the last 2 from the difference, which leaves road stumps
            sources.push(room.controller);  // so the controller also gets a path build to
            for (let source of sources) {

                let path = room.findPath(source.pos, new RoomPosition(spawn.pos.x, spawn.pos.y-1, spawn.pos.roomName), {ignoreCreeps:true});
                let queue = []

                for (let location of path) {
                    // only queue, if there is nothing else there already
                    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, location.x, location.y).length == 0 && 
                        room.lookForAt(LOOK_STRUCTURES, location.x, location.y).length == 0 &&
                        room.memory.building.buildQueue.find((element) => element.x == location.x && element.y == location.y) == undefined) {

                        queue.push({x:location.x, y:location.y, structure: STRUCTURE_ROAD});
                    }
                }

                // put new buildings in front, becuase the last ones are build first
                if (queue.length > 0) {
                    // remove first 2 element, to make some space at the mine
                    room.memory.building.buildQueue = queue.slice(2).concat(room.memory.building.buildQueue);
                }

                // for debug: console.log("queue path from {x:" + spawn.pos.x + ",y:" + spawn.pos.y + "} to {x:" + source.pos.x + ",y:" + source.pos.y + "}");
            }
            
            // check in a spiral where space is to build. The roads are only second prioraty
            let distance = room.memory.building.rangeChecked;
            let center = {x:spawn.pos.x,y:spawn.pos.y-1};
            let viableBuildingLocations = [];

            for (let dx=-distance; dx<=distance; dx++) {
                for (let dy=-distance; dy<=distance; dy++) {
                    if (Math.abs(dy) < distance && Math.abs(dx) < distance) {continue;}

                    let t = this.checkBuildLocation(room, center.x +dx, center.y +dy, BUILDINGS.extension5x5)
                    if (t >= 0) {
                        viableBuildingLocations.push({x:center.x +dx, y:center.y +dy, roads:t});
                    }
                }
            }

            if (viableBuildingLocations.length > 0) {
                // place the extension on the best location
                // todo redo this, so the best Location, with the closest range to spawn is choosen.
                let bestLocation = viableBuildingLocations.reduce((max, obj) => obj.roads > max.roads ? obj : max, viableBuildingLocations[0]);

                for (let building of BUILDINGS.extension5x5) {
                    this.pushBuildQueue(room, {x:building.x+bestLocation.x, y:building.y+bestLocation.y, structure:building.structure});
                }
                // finished queueing this building step.
                console.log("Queued buildings for stage 2");
                room.memory.building.buildingStage = 2;
            }
            else {
                room.memory.building.rangeChecked += 1;
            }
        }
        else if (rcl >= 3 && room.memory.building.buildingStage == 2) {
            // build tower
            this.placeBuildingAround(room, spawn.pos.x, spawn.pos.y-1, STRUCTURE_TOWER);

            // build extension
            // check in a spiral where space is to build. The roads are only second prioraty
            let distance = room.memory.building.rangeChecked;
            let center = {x:spawn.pos.x, y:spawn.pos.y-1};
            let viableBuildingLocations = [];

            for (let dx=-distance; dx<=distance; dx++) {
                for (let dy=-distance; dy<=distance; dy++) {
                    if (Math.abs(dy) < distance && Math.abs(dx) < distance) {continue;}

                    let t = this.checkBuildLocation(room, center.x +dx, center.y +dy, BUILDINGS.extension5x5)
                    if (t >= 0) {
                        viableBuildingLocations.push({x:center.x +dx, y:center.y +dy, roads:t});
                    }
                }
            }

            if (viableBuildingLocations.length > 0) {
                // place the extension on the best location
                // todo redo this, so the best Location, with the closest range to spawn is choosen.
                let bestLocation = viableBuildingLocations.reduce((max, obj) => obj.roads > max.roads ? obj : max, viableBuildingLocations[0]);

                for (let building of BUILDINGS.extension5x5) {
                    this.pushBuildQueue(room, {x:building.x+bestLocation.x, y:building.y+bestLocation.y, structure:building.structure});
                }
                // finished queueing this building step.
                console.log("Queued buildings for stage 2");
                room.memory.building.buildingStage = 3;
            }
            else {
                room.memory.building.rangeChecked += 1;
            }
        }
        else if (rcl >= 4 && room.memory.building.buildingStage == 3) {
            // todo build containers close to each mine, and assign collectors to these instead

            // replace container with storage
            let baseCenter = new RoomPosition(spawn.pos.x, spawn.pos.y-1, room.name);

            this.placeBuildingAround(room, baseCenter.x, baseCenter.y, STRUCTURE_STORAGE);

            let spawnStorage = baseCenter.findInRange(FIND_STRUCTURES, 1);
            spawnStorage = _.filter(spawnStorage, (element) => element.structureType == STRUCTURE_CONTAINER);
            this.destroyBuilding(spawnStorage);

            for (let i=0;i<2;i++) {
                // build 2x extension
                // ! not perfect, room.memory.building.buildingStage is set to 4 2x this way
                // check in a spiral where space is to build. The roads are only second prioraty
                let distance = room.memory.building.rangeChecked;
                let center = {x:spawn.pos.x,y:spawn.pos.y-1};
                let viableBuildingLocations = [];

                for (let dx=-distance; dx<=distance; dx++) {
                    for (let dy=-distance; dy<=distance; dy++) {
                        if (Math.abs(dy) < distance && Math.abs(dx) < distance) {continue;}

                        let t = this.checkBuildLocation(room, center.x +dx, center.y +dy, BUILDINGS.extension5x5)
                        if (t >= 0) {
                            viableBuildingLocations.push({x:center.x +dx, y:center.y +dy, roads:t});
                        }
                    }
                }

                if (viableBuildingLocations.length > 0) {
                    // place the extension on the best location
                    // todo redo this, so the best Location, with the closest range to spawn is choosen.
                    let bestLocation = viableBuildingLocations.reduce((max, obj) => obj.roads > max.roads ? obj : max, viableBuildingLocations[0]);

                    for (let building of BUILDINGS.extension5x5) {
                        this.pushBuildQueue(room, {x:building.x+bestLocation.x, y:building.y+bestLocation.y, structure:building.structure});
                    }
                    // finished queueing this building step.
                    console.log("Queued buildings for stage 2");
                    room.memory.building.buildingStage = 4;
                }
                else {
                    room.memory.building.rangeChecked += 1;
                }
            }
        }
    }
};

module.exports = MyRoom;
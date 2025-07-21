const MyRoom = require('myRoom');
const SpawningBehaviour = require('spawningBehaviour').SpawningBehaviour;
const CreepController = require('creepController').CreepController;
const ActiveBuildings = require('ActiveBuildings');

/*
    for autocomplete:
    npm install @types/screeps
    npm install @types/lodash

    to commit code from dist folder:
    grunt screeps


-todo   low prio change memory, so available positions is a object {} with x,y as keys and no array []
 todo   change collector and harvester behaviour at RCL 4 or 5.
            - only 1 harvester required per mine
            - multiple collectors should distribute to/from storages
 todo   track, when collector or worker creeps are at a tile without a road. Build roads, if often visited
 todo   plan and build roads only after the extensions are build, so the roads will be used for planning
 todo   implement recovery, in case of accidental memory deletion
 todo   save the center base coords somewhere (use in MyRoom.checkBuildLocation)
 todo   spawn new creep before they die

 - at 5 work/harvester only 1 harvester / mine is requred to mine the 3000 energy every 300 ticks (5work = 10 energy/tick)
*/

module.exports.loop = function () {
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        
        //* init rooms, if its new
        if (room.controller.my && (room.memory.isInitialized == undefined || !room.memory.isInitialized)) {
            // init room
            // get all available mining positions
            console.log("init room");
            MyRoom.init(room);
        }
    }

    //* clear Memory of dead creep:
    // todo should be cleared, when creep kill themselfs.
    for (let creepName in Memory.creeps) {
        if(!Game.creeps[creepName]) {
            console.log("emergency delete: " + creepName);
            CreepController.removeCreep(creepName);
        }
    }

    //* spawn creeps
    for (let spawn in Game.spawns) {
        try {
            SpawningBehaviour.run(Game.spawns[spawn]);
        }
        catch (e) {
            console.log("error in SpawningBehaviour!\n" + e);
            return;
        }
    }

    //* run creeps
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        try {
            CreepController.runCreep(creep);
        }
        catch (e) {
            console.log("error in runCreep " + name +"!\n" + e);
            return;
        }
    }

    //* run active buildings e.g. Tower
    for (let room in Game.rooms) {
        // add other structure Types, when they are required
        let buildings = _.filter(Game.structures, (element) => element.structureType == STRUCTURE_TOWER);

        for (building in buildings) {
            ActiveBuildings.run(building);
        }
    }

    //* build stuff, if idle
    for (let roomName in Game.rooms) {
        let spawners = Game.rooms[roomName].find(FIND_MY_SPAWNS);
        if (spawners.length > 0) {
            // room is mine, and has at least one spawner
            // building happens at the end of main, so that .spawning only is true, if no creep is spawned until now.
            // todo this is not quite efficient. When creep just spawned, and there is no blueprint, workers will move to controller
            let idleSpawner = spawners.find((element) => !element.spawning && element.store.getFreeCapacity(RESOURCE_ENERGY) == 0);
            

            if (idleSpawner != undefined) {
                // only build, if there is an idle spawner (enough energy)
                try {
                    MyRoom.build(idleSpawner.room);
                }
                catch (e) {
                    console.log("error in MyRoom.build!\n" + e);
                    return;
                }
            }
        }

        //? visualize buildqueue
        for (let item of Game.rooms[roomName].memory.building.buildQueue) {
            let roomVisual = {
                "radius":0.15,
                "fill":"#ffffff",
                "opacity":0.5,
            };

            switch (item.structure) {
                case STRUCTURE_ROAD:
                    roomVisual.fill = "#aaaaaa";
                    break;
                case STRUCTURE_EXTENSION:
                    roomVisual.fill = "#eec000";
                    break;
                default:
                    roomVisual = "#50d0c0";
                    break;
            }

            Game.rooms[roomName].visual.circle(item.x, item.y, roomVisual);
        }
    }

    //console.log(`tick: ${Game.time} CPU: ${Game.cpu.getUsed()} ms`);
}
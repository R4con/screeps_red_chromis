const roleHarvester = require('role.Harvester');
const roleCollector = require('role.Collector');
const roleWorker = require('role.Worker');
const SpawningBehaviour = require('spawningBehaviour').SpawningBehaviour;


class CreepController {
    static runCreep(creep) {
        switch(creep.memory.role) {
            case SpawningBehaviour.CREEP_TYPE.HARVESTER :
                roleHarvester.run(creep);
                break;
            case SpawningBehaviour.CREEP_TYPE.COLLECTOR :
                roleCollector.run(creep);
                break;
            case SpawningBehaviour.CREEP_TYPE.WORKER :
                roleWorker.run(creep);
                break;
            default :
                console.log("cannot run creep with role: " + creep.memory.role);
                break;
        }
    }

    static removeCreep(creepName) {
        switch(Memory.creeps[creepName].role) {
            case SpawningBehaviour.CREEP_TYPE.HARVESTER :
                roleHarvester.delete(creepName);
                break;
            case SpawningBehaviour.CREEP_TYPE.COLLECTOR :
                roleCollector.delete(creepName);
                break;
            case SpawningBehaviour.CREEP_TYPE.WORKER :
                roleWorker.delete(creepName);
                break;
            default :
                console.log("cannot delete creep with role: " + Memory.creeps[creepName].role);
                break;
        }

        delete Memory.creeps[creepName];
    }
};

module.exports = CreepController;
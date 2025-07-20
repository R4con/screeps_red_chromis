
class ActiveBuildings {
    /** @param {Structure} building **/
    static run(building) {
        switch (building.structureType) {
            case STRUCTURE_TOWER:
                ActiveBuildings.runTowers(building);
                break;
            default:
                console.log("Dont know what to do with building of type: " + building.structureType);
                break;
        }
    }

    static runTowers(tower) {
        // attack enemies, if there are any
        //let hostile_creeps = Room.find(FIND_HOSTILE_CREEPS);
        let closest_hostile_creep = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closest_hostile_creep != undefined) {
            // ? maybe handle error here
            tower.attack(closest_hostile_creep);
            return;
        }

        // heal attackers, if there are any, and they dont have max health
        //tower.heal()

        // repair structures
        let repairTargets = tower.room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax*0.75
        });

        if (repairTargets.length > 0) {
            let target = tower.pos.findClosestByRange(repairTargets);
            tower.repair(target);
        }
        //tower.repair()
    }
};

module.exports = ActiveBuildings;
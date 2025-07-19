
class roleDefender {
    /** @param {Creep} creep **/
    static run(creep) {
        let hostileCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

        if (hostileCreeps == null) {
            // no hostiles, so just do nothing
            return;
        }

        let errCode;
        if (creep.body.find((e) => e == "attack") == undefined) {
            errCode = creep.rangedAttack(hostileCreep);
            creep.say("🏹");
        }
        else {
            errCode = creep.attack(hostileCreep);
            creep.say("⚔️");
        }
        
        if (errCode == ERR_NOT_IN_RANGE) {
            creep.moveTo(hostileCreep.pos);
            return;
        }
        else if (errCode != 0) {
            console.log("other error in Harvester (1): " + errCode);
        }
    }

    static delete(creepName) {

        console.log("did not find " + creepName + " in memory.");
        return;
    }
};

module.exports = roleDefender;
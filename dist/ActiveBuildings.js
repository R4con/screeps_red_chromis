
class ActiveBuildings {
    /** @param {Structure} building **/
    static run(building) {
        switch (building.structureType) {
            case STRUCTURE_TOWER:
                // todo this
                break;
            default:
                console.log("Dont know what to do with building of type: " + building.structureType);
                break;
        }
    }
};

module.exports = ActiveBuildings;
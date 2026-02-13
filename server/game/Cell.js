export default class Cell {
  constructor(index, name, type = 'neutral') {
    this.index = index;
    this.name = name;
    this.type = type;
  }

  // Default handler for landing on a neutral cell.
  onLand(player, gameRoom) { // eslint-disable-line no-unused-vars
    return null;
  }
}

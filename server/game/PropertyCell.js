import Cell from './Cell.js';

export default class PropertyCell extends Cell {
  constructor(index, name, price, rent, group, buildable = true) {
    super(index, name, 'property');
    this.price = price;
    this.rent = rent;
    this.group = group;
    this.buildable = buildable;
    this.ownerId = null;
    this.houses = 0;
    this.hotels = 0;
    this.isMortgaged = false;
    this.lockedForAuction = false;
    this.pendingMortgage = false;
  }

  onLand(player, gameRoom) {
    gameRoom.handlePropertyLanding(this, player);
  }
}

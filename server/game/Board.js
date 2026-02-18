import Cell from './Cell.js';
import PropertyCell from './PropertyCell.js';

class TaxCell extends Cell {
  constructor(index, name, amount) {
    super(index, name, 'tax');
    this.amount = amount;
  }
}

class GoToJailCell extends Cell {
  constructor(index) {
    super(index, 'Go To Jail', 'go-to-jail');
  }
}

class GoCell extends Cell {
  constructor() {
    super(0, 'GO', 'go');
  }
}

class JailCell extends Cell {
  constructor(index) {
    super(index, 'Jail', 'jail');
  }
}

class VacationCell extends Cell {
  constructor(index) {
    super(index, 'Vacation', 'vacation');
  }
}

const MAPS = {
  world: [
    { type: 'go', name: 'GO' },
    { type: 'property', name: 'Vaikalmedu', price: 60, rent: 2, group: 'brazil' },
    { type: 'neutral', name: 'Pudhaiyal' },
    { type: 'property', name: 'Thopupalayam', price: 60, rent: 4, group: 'brazil' },
    { type: 'tax', name: 'Varumana vari', amount: 200 },
    { type: 'property', name: 'Vettaiyan Airways', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Paramathi', price: 100, rent: 6, group: 'israel' },
    { type: 'neutral', name: 'Surprise' },
    { type: 'property', name: 'P Velur', price: 100, rent: 6, group: 'israel' },
    { type: 'property', name: 'Kabilarmalai', price: 120, rent: 8, group: 'israel' },
    { type: 'jail', name: 'Jail' },
    { type: 'property', name: 'Velarivelli', price: 140, rent: 10, group: 'italy' },
    { type: 'property', name: 'U K Consultancy', price: 150, rent: 15, group: 'utility', buildable: false },
    { type: 'property', name: 'Boat Theeru', price: 140, rent: 10, group: 'italy' },
    { type: 'property', name: 'Polampatti', price: 160, rent: 12, group: 'italy' },
    { type: 'property', name: 'Eagle Tractors', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Karur', price: 180, rent: 14, group: 'germany' },
    { type: 'neutral', name: 'Pudhaiyal' },
    { type: 'property', name: 'Namakkal main', price: 180, rent: 14, group: 'germany' },
    { type: 'property', name: 'Erode', price: 200, rent: 16, group: 'germany' },
    { type: 'vacation', name: 'Vacation' },
    { type: 'property', name: 'Pollachi', price: 220, rent: 18, group: 'china' },
    { type: 'neutral', name: 'Surprise' },
    { type: 'property', name: 'Paladdam', price: 220, rent: 18, group: 'china' },
    { type: 'property', name: 'Udumalpet', price: 240, rent: 20, group: 'china' },
    { type: 'property', name: 'Vettaiyan waterways', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Unjalur', price: 260, rent: 22, group: 'france' },
    { type: 'property', name: 'Noyal', price: 260, rent: 22, group: 'france' },
    { type: 'property', name: 'Kathirvel vathukadai', price: 150, rent: 15, group: 'utility', buildable: false },
    { type: 'property', name: 'Kodumudi', price: 280, rent: 24, group: 'france' },
    { type: 'go-to-jail', name: 'Go To Jail' },
    { type: 'property', name: 'Sala Palayam', price: 300, rent: 26, group: 'uk' },
    { type: 'property', name: 'Govindham Palyam', price: 300, rent: 26, group: 'uk' },
    { type: 'neutral', name: 'Pudhaiyal' },
    { type: 'property', name: 'Valaiyal Karan Pudhur', price: 320, rent: 28, group: 'uk' },
    { type: 'property', name: 'Vettaiyan Roadways', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'neutral', name: 'Surprise' },
    { type: 'property', name: 'Mettur Dam', price: 350, rent: 35, group: 'usa' },
    { type: 'tax', name: 'Aadambara Vari', amount: 100 },
    { type: 'property', name: 'Kolathur Beach', price: 400, rent: 50, group: 'usa' },
  ],
  legends: [
    { type: 'go', name: 'GO' },
    { type: 'property', name: 'Osaka Bay', price: 60, rent: 2, group: 'japan' },
    { type: 'neutral', name: 'Festival Fund' },
    { type: 'property', name: 'Shibuya Crossing', price: 60, rent: 4, group: 'japan' },
    { type: 'tax', name: 'Cultural Tax', amount: 200 },
    { type: 'property', name: 'Shinkansen Rail', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Valencia Harbor', price: 100, rent: 6, group: 'spain' },
    { type: 'neutral', name: 'Discovery' },
    { type: 'property', name: 'Seville Plaza', price: 100, rent: 6, group: 'spain' },
    { type: 'property', name: 'Bilbao Docks', price: 120, rent: 8, group: 'spain' },
    { type: 'jail', name: 'Harbor Detention' },
    { type: 'property', name: 'Vancouver Quay', price: 140, rent: 10, group: 'canada' },
    { type: 'property', name: 'Niagara Energy', price: 150, rent: 15, group: 'utility', buildable: false },
    { type: 'property', name: 'Toronto Market', price: 140, rent: 10, group: 'canada' },
    { type: 'property', name: 'Montreal Mile', price: 160, rent: 12, group: 'canada' },
    { type: 'property', name: 'Polar Express Rail', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Delhi Bazaar', price: 180, rent: 14, group: 'india' },
    { type: 'neutral', name: 'Heritage Chest' },
    { type: 'property', name: 'Jaipur Gates', price: 180, rent: 14, group: 'india' },
    { type: 'property', name: 'Kochi Port', price: 200, rent: 16, group: 'india' },
    { type: 'vacation', name: 'Safari Rest Stop' },
    { type: 'property', name: 'Sydney Harbour', price: 220, rent: 18, group: 'australia' },
    { type: 'neutral', name: 'Discovery' },
    { type: 'property', name: 'Brisbane Bay', price: 220, rent: 18, group: 'australia' },
    { type: 'property', name: 'Perth Outback', price: 240, rent: 20, group: 'australia' },
    { type: 'property', name: 'Coral Coast Rail', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'property', name: 'Oaxaca Street', price: 260, rent: 22, group: 'mexico' },
    { type: 'property', name: 'Cancun Shore', price: 260, rent: 22, group: 'mexico' },
    { type: 'property', name: 'Maya Utilities', price: 150, rent: 15, group: 'utility', buildable: false },
    { type: 'property', name: 'Tulum Ruins', price: 280, rent: 24, group: 'mexico' },
    { type: 'go-to-jail', name: 'Go To Jail' },
    { type: 'property', name: 'Cape Town Ridge', price: 300, rent: 26, group: 'southafrica' },
    { type: 'property', name: 'Durban Market', price: 300, rent: 26, group: 'southafrica' },
    { type: 'neutral', name: 'Heritage Fund' },
    { type: 'property', name: 'Pretoria Square', price: 320, rent: 28, group: 'southafrica' },
    { type: 'property', name: 'Savannah Rail', price: 200, rent: 25, group: 'railroad', buildable: false },
    { type: 'neutral', name: 'Discovery' },
    { type: 'property', name: 'Stockholm Quay', price: 350, rent: 35, group: 'sweden' },
    { type: 'tax', name: 'Fjord Tax', amount: 100 },
    { type: 'property', name: 'Gothenburg Pier', price: 400, rent: 50, group: 'sweden' },
  ],
};

export default class Board {
  constructor(mapKey = 'world') {
    this.mapKey = MAPS[mapKey] ? mapKey : 'world';
    this.cells = this.buildBoard(MAPS[this.mapKey]);
  }

  buildBoard(mapDef) {
    const cells = [];

    mapDef.forEach((def, index) => {
      switch (def.type) {
        case 'go':
          cells[index] = new GoCell();
          break;
        case 'jail':
          cells[index] = new JailCell(index);
          break;
        case 'vacation':
          cells[index] = new VacationCell(index);
          break;
        case 'go-to-jail':
          cells[index] = new GoToJailCell(index);
          break;
        case 'tax':
          cells[index] = new TaxCell(index, def.name, def.amount);
          break;
        case 'property':
          cells[index] = new PropertyCell(
            index,
            def.name,
            def.price,
            def.rent,
            def.group,
            def.buildable === undefined ? true : def.buildable,
          );
          break;
        default:
          cells[index] = new Cell(index, def.name, 'neutral');
          break;
      }
    });

    return cells;
  }

  getCell(index) {
    return this.cells[index];
  }

  getState() {
    return this.cells.map((cell) => {
      const base = {
        index: cell.index,
        name: cell.name,
        type: cell.type,
      };

      if (cell.type === 'property') {
        return {
          ...base,
          price: cell.price,
          rent: cell.rent,
          ownerId: cell.ownerId,
          group: cell.group,
          buildable: cell.buildable,
          houses: cell.houses,
          hotels: cell.hotels,
          isMortgaged: cell.isMortgaged,
          lockedForAuction: cell.lockedForAuction,
          pendingMortgage: cell.pendingMortgage,
        };
      }

      if (cell.type === 'tax') {
        return {
          ...base,
          amount: cell.amount,
        };
      }

      return base;
    });
  }
}

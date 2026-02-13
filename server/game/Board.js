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

export default class Board {
  constructor() {
    this.cells = this.buildBoard();
  }

  buildBoard() {
    const cells = [];
    cells[0] = new GoCell();
    cells[1] = new PropertyCell(1, 'Salvador', 60, 2, 'brazil');
    cells[2] = new Cell(2, 'Treasure', 'neutral');
    cells[3] = new PropertyCell(3, 'Rio', 60, 4, 'brazil');
    cells[4] = new TaxCell(4, 'Income Tax', 200);
    cells[5] = new PropertyCell(5, 'TLV Airport', 200, 25, 'railroad', false);
    cells[6] = new PropertyCell(6, 'Tel Aviv', 100, 6, 'israel');
    cells[7] = new Cell(7, 'Surprise', 'neutral');
    cells[8] = new PropertyCell(8, 'Haifa', 100, 6, 'israel');
    cells[9] = new PropertyCell(9, 'Jerusalem', 120, 8, 'israel');

    cells[10] = new JailCell(10);
    cells[11] = new PropertyCell(11, 'Venice', 140, 10, 'italy');
    cells[12] = new PropertyCell(12, 'Electric Company', 150, 15, 'utility', false);
    cells[13] = new PropertyCell(13, 'Milan', 140, 10, 'italy');
    cells[14] = new PropertyCell(14, 'Rome', 160, 12, 'italy');
    cells[15] = new PropertyCell(15, 'MUC Airport', 200, 25, 'railroad', false);
    cells[16] = new PropertyCell(16, 'Frankfurt', 180, 14, 'germany');
    cells[17] = new Cell(17, 'Treasure', 'neutral');
    cells[18] = new PropertyCell(18, 'Munich', 180, 14, 'germany');
    cells[19] = new PropertyCell(19, 'Berlin', 200, 16, 'germany');

    cells[20] = new VacationCell(20);
    cells[21] = new PropertyCell(21, 'Shenzhen', 220, 18, 'china');
    cells[22] = new Cell(22, 'Surprise', 'neutral');
    cells[23] = new PropertyCell(23, 'Beijing', 220, 18, 'china');
    cells[24] = new PropertyCell(24, 'Shanghai', 240, 20, 'china');
    cells[25] = new PropertyCell(25, 'CDG Airport', 200, 25, 'railroad', false);
    cells[26] = new PropertyCell(26, 'Lyon', 260, 22, 'france');
    cells[27] = new PropertyCell(27, 'Toulouse', 260, 22, 'france');
    cells[28] = new PropertyCell(28, 'Water Company', 150, 15, 'utility', false);
    cells[29] = new PropertyCell(29, 'Paris', 280, 24, 'france');

    cells[30] = new GoToJailCell(30);
    cells[31] = new PropertyCell(31, 'Liverpool', 300, 26, 'uk');
    cells[32] = new PropertyCell(32, 'Manchester', 300, 26, 'uk');
    cells[33] = new Cell(33, 'Treasure', 'neutral');
    cells[34] = new PropertyCell(34, 'London', 320, 28, 'uk');
    cells[35] = new PropertyCell(35, 'JFK Airport', 200, 25, 'railroad', false);
    cells[36] = new Cell(36, 'Surprise', 'neutral');
    cells[37] = new PropertyCell(37, 'San Francisco', 350, 35, 'usa');
    cells[38] = new TaxCell(38, 'Luxury Tax', 100);
    cells[39] = new PropertyCell(39, 'New York', 400, 50, 'usa');

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

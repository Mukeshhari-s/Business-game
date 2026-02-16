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
    cells[1] = new PropertyCell(1, 'Vaikalmedu', 60, 2, 'brazil');
    cells[2] = new Cell(2, 'Pudhaiyal', 'neutral');
    cells[3] = new PropertyCell(3, 'Thopupalayam', 60, 4, 'brazil');
    cells[4] = new TaxCell(4, 'Varumana vari', 200);
    cells[5] = new PropertyCell(5, 'Vettaiyan Airways', 200, 25, 'railroad', false);
    cells[6] = new PropertyCell(6, 'Paramathi', 100, 6, 'israel');
    cells[7] = new Cell(7, 'Surprise', 'neutral');
    cells[8] = new PropertyCell(8, 'P Velur', 100, 6, 'israel');
    cells[9] = new PropertyCell(9, 'Kabilarmalai', 120, 8, 'israel');

    cells[10] = new JailCell(10);
    cells[11] = new PropertyCell(11, 'Velarivelli', 140, 10, 'italy');
    cells[12] = new PropertyCell(12, 'U K Consultancy', 150, 15, 'utility', false);
    cells[14] = new PropertyCell(14, 'Polampatti', 160, 12, 'italy');
    cells[13] = new PropertyCell(13, 'Boat Theeru', 140, 10, 'italy');
    cells[15] = new PropertyCell(15, 'Eagle Tractors', 200, 25, 'railroad', false);
    cells[16] = new PropertyCell(16, 'Karur', 180, 14, 'germany');
    cells[17] = new Cell(17, 'Pudhaiyal', 'neutral');
    cells[18] = new PropertyCell(18, 'Namakkal main', 180, 14, 'germany');
    cells[19] = new PropertyCell(19, 'Erode', 200, 16, 'germany');

    cells[20] = new VacationCell(20);
    cells[21] = new PropertyCell(21, 'Pollachi', 220, 18, 'china');
    cells[22] = new Cell(22, 'Surprise', 'neutral');
    cells[23] = new PropertyCell(23, 'Paladdam', 220, 18, 'china');
    cells[24] = new PropertyCell(24, 'Udumalpet', 240, 20, 'china');
    cells[25] = new PropertyCell(25, 'Vettaiyan waterways', 200, 25, 'railroad', false);
    cells[26] = new PropertyCell(26, 'Unjalur', 260, 22, 'france');
    cells[27] = new PropertyCell(27, 'Noyal', 260, 22, 'france');
    cells[28] = new PropertyCell(28, 'Kathirvel vathukadai', 150, 15, 'utility', false);
    cells[29] = new PropertyCell(29, 'Kodumudi', 280, 24, 'france');

    cells[30] = new GoToJailCell(30);
    cells[31] = new PropertyCell(31, 'Sala Palayam', 300, 26, 'uk');
    cells[32] = new PropertyCell(32, 'Govindham Palyam', 300, 26, 'uk');
    cells[33] = new Cell(33, 'Pudhaiyal', 'neutral');
    cells[34] = new PropertyCell(34, 'Valaiyal Karan Pudhur', 320, 28, 'uk');
    cells[35] = new PropertyCell(35, 'Vettaiyan Roadways', 200, 25, 'railroad', false);
    cells[36] = new Cell(36, 'Surprise', 'neutral');
    cells[37] = new PropertyCell(37, 'Mettur Dam', 350, 35, 'usa');
    cells[38] = new TaxCell(38, 'Aadambara Vari', 100);
    cells[39] = new PropertyCell(39, 'Kolathur Beach', 400, 50, 'usa');

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

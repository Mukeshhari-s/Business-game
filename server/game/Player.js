import { randomUUID } from 'crypto';

export default class Player {
  constructor(name, socketId) {
    this.playerId = randomUUID();
    this.name = name;
    this.socketId = socketId;
    this.position = 0;
    this.balance = 1500;
    this.properties = [];
    this.jailCards = 0;
    this.inJail = false;
    this.jailTurns = 0;
    this.inVacation = false;
    this.vacationTurns = 0;
    this.isBankrupt = false;
    this.connected = true;
  }

  toPublic() {
    return {
      playerId: this.playerId,
      name: this.name,
      position: this.position,
      balance: this.balance,
      properties: [...this.properties],
      jailCards: this.jailCards,
      inJail: this.inJail,
      jailTurns: this.jailTurns,
      inVacation: this.inVacation,
      vacationTurns: this.vacationTurns,
      isBankrupt: this.isBankrupt,
      connected: this.connected,
    };
  }
}

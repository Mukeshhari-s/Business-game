export default class Dice {
  static roll() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    return { die1, die2, total: die1 + die2 };
  }
}

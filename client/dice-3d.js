// 3D Dice Rolling Logic

function rollDice3D(die1Element, die2Element, value1, value2) {
    // Remove any existing show classes
    die1Element.className = 'dice rolling';
    die2Element.className = 'dice rolling';

    // After animation completes, show the result
    setTimeout(() => {
        die1Element.className = `dice show-${value1}`;
        die2Element.className = `dice show-${value2}`;
    }, 1000); // Match the animation duration
}

// Update dice display
function updateDiceDisplay(dice) {
    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    const diceTotal = document.getElementById('diceTotal');

    if (die1 && die2 && dice && dice.values && dice.values.length === 2) {
        const [value1, value2] = dice.values;

        // Roll the dice with animation
        rollDice3D(die1, die2, value1, value2);

        // Update total
        if (diceTotal) {
            diceTotal.textContent = `Total: ${dice.total}`;
        }
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateDiceDisplay };
}

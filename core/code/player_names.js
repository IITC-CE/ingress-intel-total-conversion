/**
 * @file Manages player names and provides functions to check if a player is a special system account.
 *
 * @module player_names
 */

/**
 * Checks if a player name is a special system account (e.g., `__JARVIS__`, `__ADA__`)
 * that shouldn't be listed as a regular player.
 *
 * @function isSystemPlayer
 * @param {string} name - The player name to check.
 * @returns {boolean} Returns `true` if the player name is a system account, otherwise `false`.
 */
window.isSystemPlayer = function (name) {

  switch (name) {
    case '__ADA__':
    case '__JARVIS__':
    case '__MACHINA__':
      return true;

    default:
      return false;
  }

}

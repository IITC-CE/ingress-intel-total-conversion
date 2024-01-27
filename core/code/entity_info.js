/* exported setup --eslint */

/**
 * Entity Details Tools
 * Functions to extract useful data from entity details, such as portals, links, and fields.
 * @module entity_info
 */

/**
 * Given the entity detail data, returns the team the entity belongs to.
 * Uses TEAM_* enum values.
 *
 * @function getTeam
 * @param {Object} details - The details hash of an entity.
 * @returns {number} The team ID the entity belongs to.
 */
window.getTeam = function (details) {
  return window.teamStringToId(details.team);
};

/**
 * Converts a team string to a team ID.
 *
 * @function teamStringToId
 * @param {string} teamStr - The team string to convert.
 * @returns {number} The team ID corresponding to the team string.
 */
window.teamStringToId = function (teamStr) {
  var teamIndex = window.TEAM_CODENAMES.indexOf(teamStr);
  if (teamIndex >= 0) return teamIndex;
  teamIndex = window.TEAM_CODES.indexOf(teamStr);
  if (teamIndex >= 0) return teamIndex;
  return window.TEAM_NONE;
};

/* exported setup --eslint */

// ENTITY DETAILS TOOLS //////////////////////////////////////////////
// hand any of these functions the details-hash of an entity (i.e.
// portal, link, field) and they will return useful data.

// given the entity detail data, returns the team the entity belongs
// to. Uses TEAM_* enum values.
window.getTeam = function (details) {
  return window.teamStringToId(details.team);
};

window.teamStringToId = function (teamStr) {
  var teamIndex = window.TEAM_NAMES.indexOf(teamStr);
  if (teamIndex >= 0) return teamIndex;
  teamIndex = window.TEAM_CODES.indexOf(teamStr);
  if (teamIndex >= 0) return teamIndex;
  return window.TEAM_NONE;
};

/* exported setup --eslint */
/* global TEAM_NONE, TEAM_RES, TEAM_ENL, TEAM_MAC */

// ENTITY DETAILS TOOLS //////////////////////////////////////////////
// hand any of these functions the details-hash of an entity (i.e.
// portal, link, field) and they will return useful data.


// given the entity detail data, returns the team the entity belongs
// to. Uses TEAM_* enum values.
window.getTeam = function(details) {
  return teamStringToId(details.team);
}

window.teamStringToId = function(teamStr) {
  var team = TEAM_NONE;
  if(teamStr === 'ENLIGHTENED') team = TEAM_ENL;
  if(teamStr === 'RESISTANCE') team = TEAM_RES;
  if (teamStr === window.TEAM_NAME_MAC) team = TEAM_MAC;
  if(teamStr === 'E') team = TEAM_ENL;
  if(teamStr === 'R') team = TEAM_RES;
  if (teamStr === window.TEAM_CODE_MAC) team = TEAM_MAC;
  return team;
}



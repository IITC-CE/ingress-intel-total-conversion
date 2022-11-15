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
  switch (teamStr) {
    case window.TEAM_NAME_ENL:
    case window.TEAM_CODE_ENL:
      return window.TEAM_ENL;

    case window.TEAM_NAME_RES:
    case window.TEAM_CODE_RES:
      return window.TEAM_RES;

    case window.TEAM_NAME_MAC:
    case window.TEAM_CODE_MAC:
      return window.TEAM_MAC;

    default:
      return window.TEAM_NONE;
  }
};

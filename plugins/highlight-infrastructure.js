// @author         vita10gy
// @name           Highlight portals with infrastructure problems
// @category       Highlighter
// @version        0.2.1
// @description    Use the portal fill color to denote if the portal has any infrastructure problems. Red: no picture. Yellow: potential title issue. Orange:  both of these.


// use own namespace for plugin
window.plugin.portalInfrastructure = function() {};

window.plugin.portalInfrastructure.badTitles = ['^statue$',
                                                '^fountain$',
                                                '^sculpture$',
                                                '^post office$',
                                                '^us post office$',
                                                '^church$',
                                                'untitled',
                                                'no title'];

window.plugin.portalInfrastructure.highlight = function(data) {
  var d = data.portal.options.data;
  var color = '';
  var opa = .75;

  if(!(d.image)) {
    color = 'red';
  }

  if((new RegExp(window.plugin.portalInfrastructure.badTitles.join("|"),'i')).test(d.title)) {
    color = color == 'red' ? 'orange' : 'yellow';
    opa = .9;
  }
  
  if(color !== '') {
    var params = {fillColor: color, fillOpacity: opa};
    data.portal.setStyle(params);  
  }
 
}

var setup =  function() {
  window.addPortalHighlighter('Infrastructure', window.plugin.portalInfrastructure.highlight);
}

var Button = L.Control.extend({
  includes: L.Mixin.Events,

  options: {
    position: 'topleft',
    listenTo: 'click',
    label: '',
    title: '',
    className: '',
    toggle: false,
  },

  initialize: function (options) {
    L.setOptions(this, options);
    this.toggled = false;
    if (this.options.style) {
      var style = document.createElement('style');
      document.head.appendChild(style);
      style.type = 'text/css';
      style.appendChild(document.createTextNode(this.options.style));
    }
  },

  onAdd: function (map) {
    var options = this.options;
    var button = this.button = document.createElement('a');
    button.innerHTML = options.label;
    button.title = options.title;
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, 'click', L.DomEvent.preventDefault);

    var self = this;
    if (options.toggle) {
      L.DomEvent.on(button, 'click', function (ev) {
        this.classList.toggle('active');
        self.toggled = !self.toggled;
        var data = { originalEvent: ev };
        self.fire(self.toggled ? 'toggle' : 'untoggle', data);
      });
    }
    L.DomEvent.on(button, options.listenTo, function (ev) {
      var data = { originalEvent: ev };
      this.fire(ev.type, data);
    }, this);

    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', options.title);

    var container = document.createElement('div');
    container.className = 'leaflet-bar ' + (options.className || '');
    container.appendChild(button);

    this.fire('add');
    return container;
  },

  onRemove: function (map) {
    this.fire('remove');
  }
});

L.Control.Button = Button;
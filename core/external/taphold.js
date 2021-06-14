(function ($) {
  function namespaced (name, ns) {
    return name.replace(/\w+/g, '$&'+ns);
  }

  var startevent = namespaced(window.PointerEvent ? 'pointerdown' : 'touchstart mousedown', '.taphold');

  var preventClick = {
    isActive: false,

    handler: function (event) {
      preventClick.off();
      event.stopPropagation();
      event.preventDefault();
    },

    off: function () {
      document.removeEventListener('click', preventClick.handler, {capture: true});
      $(document).off('.enableclick');
      preventClick.isActive = false;
    },

    on: function () {
      if (!preventClick.isActive) {
        preventClick.isActive = true;
        $(document).on(namespaced(startevent,'.enableclick'), preventClick.off);
        // https://stackoverflow.com/a/20290312/2520247
        // Note: listeners directly attached to element may skip capture phase
        //       that's why we add add our click-preventing handler to `document`
        document.addEventListener('click', preventClick.handler, {capture: true});
        // https://github.com/jquery/jquery/issues/1735
      }
    }
  };

  var _cancel = '.taphold.cancel';
  var cancelevent = {
    pointerdown: namespaced('pointerup pointercancel pointerout', _cancel),
    touchstart: namespaced('touchend touchmove touchcancel', _cancel),
    mousedown: namespaced('mouseup mouseout dragstart', _cancel)
  };

  function startHandler (event) {
    var data = event.data;
    if (event.originalEvent.isPrimary === false) { return; }
    if (typeof event.button === 'number') {
      if (event.button !== 0) { return; }
    } else if (event.touches) {
      if (event.touches.length !== 1) { return; }
    }
    var $elem = $(this);
    var _timer = setTimeout(function () {
      $elem.off(_cancel);
      $elem.triggerHandler($.Event('taphold', {target: event.target}), data);
      if (event.type === 'touchstart' || event.pointerType === 'touch') {
        // prevent simulated mouse events https://w3c.github.io/touch-events/#mouse-events
        $elem.one('touchend', data, function (e) { e.preventDefault(); });
      } else {
        preventClick.on();
      }
    }, data.delay);
    $elem.on(cancelevent[event.type], data, function () {
      $elem.off(_cancel);
      clearTimeout(_timer); // cancel taphold
    });
  }

  $.event.special.taphold = {
    defaults: {
      delay: 500
    },

    setup: function (data) {
      data = $.extend({}, $.event.special.taphold.defaults, data);
      $(this).on(startevent, data, startHandler);
    },

    teardown: function () {
      $(this).off('.taphold');
    }
  };
})(jQuery);

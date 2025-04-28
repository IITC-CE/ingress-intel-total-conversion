
(function (removeAllLayers) {
    L.EditToolbar.Delete.include({
        removeAllLayers: function () {
            if (confirm('Are you sure?')) {
                removeAllLayers.call(this);
            }
        },
        removeAllLayersDirect: function () {
            removeAllLayers.call(this);
        }
    });
})(L.EditToolbar.Delete.prototype.removeAllLayers);

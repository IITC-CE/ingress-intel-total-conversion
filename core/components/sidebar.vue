<template>
    <div id="sidebar-component">
        <a id="sidebartoggle" accesskey="i" title="Toggle sidebar [i]"><span class="toggle close"></span></a>
        <div id="scrollwrapper"> {{ /* enable scrolling for small screens */ }}
            <div id="sidebar" style="display: none">
                <div id="playerstat">t</div>
                <div id="gamestat">&nbsp;loading global control stats</div>
                <div id="searchwrapper">
                    <button title="Current location" id="buttongeolocation"><img v-bind:src="current_location_icon" alt="Current location"/></button>
                    <input id="search" placeholder="Search location…" type="search" accesskey="f" title="Search for a place [f]"/>
                </div>
                <div id="portaldetails"></div>
                <input id="redeem" placeholder="Redeem code…" type="text"/>
                <div id="toolbox" class="toolbox legacy">
                    <a onmouseover="setPermaLink(this)" onclick="setPermaLink(this);return androidPermalink()" title="URL link to this map view">Permalink</a>
                    <a onclick="window.aboutIITC()" style="cursor: help">About IITC</a>
                </div>
                <toolbox v-bind:toolbox_items=toolbox_items></toolbox>
            </div>
        </div>
    </div>
</template>

<script>
  module.exports = {
    data: function () {
      return {
        toolbox_items: [
          {id: "permalink", href: "", value: "Permalink", title: "URL link to this map view", click: "this.modify_item('permalink', 'href', window.makePermalink(null,true))"},
          {id: "about", value: "About IITC", click: "window.aboutIITC()", style: "cursor: help"}
        ],
        current_location_icon: '@include_img:images/current-location.png@'
      }
    },
    methods: {
      _modernize_toolbox: function(mutationsList, observer) {

        for (let mutation of mutationsList) {
          if (mutation.type === 'childList') {

            if (mutation.addedNodes.length > 0) {
              for(let item of mutation.addedNodes) {
                if (item.id === "") {
                  item.id = "toolbox-item-"+Math.random().toString(36).substring(2);
                }
                vm.sidebar.$data.toolbox_items.push({value: item.innerText, click: "$('#"+item.id+"').click()"})
              }
            }

          }
        }

      }
    },
    mounted() {
      vm.sidebar = this;
      const toolboxNode = document.getElementById('toolbox');
      const observer = new MutationObserver(this._modernize_toolbox);
      observer.observe(toolboxNode, { childList: true });
    }
  }
</script>
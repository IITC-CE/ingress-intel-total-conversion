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
            </div>
        </div>
    </div>
</template>

<script>
  module.exports = {
    data: function () {
      return {
        current_location_icon: '@include_img:images/current-location.png@'
      }
    },
    mounted() {
      vm.sidebar = this;
    }
  }
</script>
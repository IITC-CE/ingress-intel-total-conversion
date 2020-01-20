<template>
    <div id="chat-component">
        <div id="chatcontrols" style="display:none">
            <a accesskey="0" title="[0]"><span class="toggle expand"></span></a>
            <template v-for="(item, index) in controls">
                <a v-bind:accesskey="index+1" v-bind:title="item.title" v-bind:class="{ active: item.active }">{{ item.name }}</a>
            </template>
        </div>
        <div id="chat" style="display:none">
            <div id="chatfaction"></div>
            <div id="chatall"></div>
            <div id="chatalerts"></div>
        </div>
        <form id="chatinput" style="display:none">
            <table>
                <tr>
                    <td><time></time></td>
                    <td><mark>tell faction:</mark></td>
                    <td><input id="chattext" type="text" maxlength="256" accesskey="c" title="[c]" /></td>
                </tr>
            </table>
        </form>
    </div>
</template>

<script>
  module.exports = {
    data: function () {
      return {
        controls: [
          {title: "[1]", name: "all"},
          {title: "[2]", name: "faction", active: true},
          {title: "[3]", name: "alerts"},
        ]
      }
    },
    mounted() {
      vm.chat = this;
    }
  }
</script>
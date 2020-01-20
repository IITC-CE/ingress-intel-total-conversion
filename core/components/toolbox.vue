<template>
  <div class="toolbox">
    <template v-for="item in toolbox_items">
      <a v-bind:href="_tb(item, 'href')"
         v-bind:title="_tb(item, 'title')"
         v-bind:style="_tb(item, 'style')"
         v-on:click="_tb(item, 'click')"
         v-on:mouseover="_tb(item, 'mouseover')"
         v-on:mouseout="_tb(item, 'mouseout')">{{ item.value }}</a>
    </template>
  </div>
</template>

<script>
  module.exports = {
    props: {
      'toolbox_items': Array,
    },
    methods: {
      add_item: function(obj) {
        this.toolbox_items.push(obj);
      },
      modify_item: function(id, key, value) {
        for (let i = 0; i < this.toolbox_items.length; i++) {
          if (this.toolbox_items[i].id === id) {
            this.toolbox_items[i][key] = value;
          }
        }
      },
      _tb: function(item, field) {
        if (item[field] !== undefined) {
          if (["click", "mouseover", "mouseout"].includes(field)) {
            eval(item[field]);
          } else {
            return item[field]
          }
        }
      }
    },
    mounted() {
      vm.toolbox = this;
    }
  }
</script>

<style>
  .toolbox > a {
    margin-left: 5px;
    margin-right: 5px;
    white-space: nowrap;
    display: inline-block;
  }
  body.smartphone > .toolbox > a {
    padding: 5px;
    margin-top: 3px;
    margin-bottom: 3px;
    border: 2px outset #20A8B1;
  }
</style>
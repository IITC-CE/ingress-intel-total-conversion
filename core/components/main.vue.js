window.vm = {};

Vue.component("updatestatus", httpVueLoader(`'@include_raw:components/updatestatus.vue@'`));
Vue.component("chat", httpVueLoader(`'@include_raw:components/chat.vue@'`));
Vue.component("toolbox", httpVueLoader(`'@include_raw:components/toolbox.vue@'`));
Vue.component("sidebar", httpVueLoader(`'@include_raw:components/sidebar.vue@'`));

let app = new Vue({
  el: '#app',
  mounted() {
    vm.main = this;
  }
})


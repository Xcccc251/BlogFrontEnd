<template>
  <div class="loading loading-active" v-show="loadingStore.isLoading">
    <div class="load-box">
      <img class="loading-img" src="http://47.100.111.28:9000/myblogv2/26075465469-1-192.gif" alt="Loading">
      <span>数据加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import useLoadingStore from "@/store/modules/loading.ts";
const loadingStore = useLoadingStore()
</script>

<style scoped lang="scss">
.loading {
  width: 100%;
  height: 100%;
  position: fixed;
  color: #000; /* 修改字体颜色为黑色 */
  background: #fff; /* 修改背景颜色为白色 */
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;

  .load-box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .loading-img {
      width: 250px;
      user-select: none;
      -webkit-user-drag: none;
    }

    span {
      margin-top: 1rem;
      font-size: 1rem;
      font-weight: bold;
    }
  }
}
</style>

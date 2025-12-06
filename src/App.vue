<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1>Vue3 + Element Plus</h1>
        <el-menu
          mode="horizontal"
          :default-active="activeIndex"
          class="header-menu"
          @select="handleSelect"
        >
          <el-menu-item index="1">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="2">
            <el-icon><Document /></el-icon>
            <span>关于</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { HomeFilled, Document } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const activeIndex = ref(route.path === '/' ? '1' : '2')

const handleSelect = (key: string) => {
  if (key === '1') {
    router.push('/')
  } else if (key === '2') {
    router.push('/about')
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
}

.header-menu {
  background-color: transparent;
  border-bottom: none;
}

.header-menu :deep(.el-menu-item) {
  color: white;
  border-bottom: 2px solid transparent;
}

.header-menu :deep(.el-menu-item:hover),
.header-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-bottom-color: white;
}

.app-main {
  background-color: #f5f5f5;
  height: 100%;
  width: 100%;
}
</style>


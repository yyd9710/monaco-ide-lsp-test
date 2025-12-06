<template>
  <div class="about-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>关于项目</span>
        </div>
      </template>
      <el-descriptions title="技术栈" :column="2" border>
        <el-descriptions-item label="框架">Vue 3</el-descriptions-item>
        <el-descriptions-item label="UI 组件库">Element Plus</el-descriptions-item>
        <el-descriptions-item label="构建工具">Vite</el-descriptions-item>
        <el-descriptions-item label="类型系统">TypeScript</el-descriptions-item>
        <el-descriptions-item label="状态管理">Pinia</el-descriptions-item>
        <el-descriptions-item label="路由">Vue Router</el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <el-timeline>
        <el-timeline-item timestamp="项目初始化" placement="top">
          <el-card>
            <h4>项目结构已创建</h4>
            <p>包含完整的 Vue3 + Element Plus + TypeScript 配置</p>
          </el-card>
        </el-timeline-item>
        <el-timeline-item timestamp="下一步" placement="top">
          <el-card>
            <h4>开始开发</h4>
            <p>根据需求添加功能和组件</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// About 页面组件
</script>

<style scoped>
.about-container {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  font-weight: bold;
  font-size: 18px;
}

.el-timeline {
  margin-top: 20px;
}
</style>


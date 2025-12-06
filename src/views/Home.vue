<template>
  <div class="home-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <span>欢迎使用 Vue3 + Element Plus</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card shadow="hover" @click="route2IDEPage">
            <el-icon :size="40" color="#409eff"><Document /></el-icon>
            <h3>TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-icon :size="40" color="#67c23a"><Setting /></el-icon>
            <h3>Element Plus</h3>
            <p>丰富的 UI 组件库</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-icon :size="40" color="#e6a23c"><Star /></el-icon>
            <h3>Vue Router</h3>
            <p>强大的路由管理</p>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="demo-card">
      <template #header>
        <div class="card-header">
          <span>示例组件</span>
        </div>
      </template>
      <el-space direction="vertical" size="large" style="width: 100%">
        <el-button type="primary">主要按钮</el-button>
        <el-button type="success">成功按钮</el-button>
        <el-button type="info">信息按钮</el-button>
        <el-button type="warning">警告按钮</el-button>
        <el-button type="danger">危险按钮</el-button>
      </el-space>

      <el-divider />

      <el-form :model="form" label-width="100px" style="max-width: 500px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">提交</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Setting, Star } from '@element-plus/icons-vue'
import router from '@/router'

interface FormData {
  username: string
  password: string
}

const form = ref<FormData>({
  username: '',
  password: ''
})

const handleSubmit = (): void => {
  ElMessage.success('表单提交成功！')
  console.log('表单数据:', form.value)
}

const handleReset = (): void => {
  form.value = {
    username: '',
    password: ''
  }
  ElMessage.info('表单已重置')
}

const route2IDEPage = (): void => {
  router.push('/ide')
}

</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-card,
.demo-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
}

.el-card {
  text-align: center;
}

.el-card h3 {
  margin: 10px 0;
  color: #303133;
}

.el-card p {
  color: #909399;
  margin: 0;
}
</style>


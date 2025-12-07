<template>
    <div class="file-tree-node">
        <div
            class="node-item"
            :class="{ 'selected': node.selected, 'dragging': isDragging }"
            :style="{ paddingLeft: `${level * 16 + 4}px` }"
            @click="handleClick"
            @contextmenu.prevent="handleContextMenu"
            @dblclick="handleDoubleClick"
            draggable="true"
            @dragstart="handleDragStart"
            @dragover="handleDragOver"
            @drop="handleDrop"
            @dragend="handleDragEnd"
        >
            <span class="node-icon" @click.stop="toggleExpand">
                <span v-if="node.type === 'folder'" class="folder-icon">
                    {{ node.expanded ? '📂' : '📁' }}
                </span>
                <span v-else class="file-icon">📄</span>
            </span>
            <span class="node-name" :title="node.name">{{ node.name }}</span>
        </div>
        
        <!-- 子节点 -->
        <div v-if="node.type === 'folder' && node.expanded && node.children" class="node-children">
            <FileTreeNode
                v-for="child in node.children"
                :key="child.path"
                :node="child"
                :level="level + 1"
                @select="$emit('select', $event)"
                @create-file="(parentPath, fileName) => $emit('create-file', parentPath, fileName)"
                @create-folder="(parentPath, folderName) => $emit('create-folder', parentPath, folderName)"
                @delete="$emit('delete', $event)"
                @drag-start="$emit('drag-start', $event)"
                @drag-over="(event, node) => $emit('drag-over', event, node)"
                @drop="$emit('drop', $event)"
            />
        </div>
        
        <!-- 右键菜单 -->
        <div
            v-if="showContextMenu"
            class="context-menu"
            :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
            @click.stop
        >
            <div class="context-menu-item" @click="handleCreateFile">
                <span class="menu-icon">📄</span>
                <span>新建文件</span>
            </div>
            <div class="context-menu-item" @click="handleCreateFolder" v-if="node.type === 'folder'">
                <span class="menu-icon">📁</span>
                <span>新建文件夹</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" @click="handleDelete">
                <span class="menu-icon">🗑️</span>
                <span>删除</span>
            </div>
        </div>
        
        <!-- 创建文件/文件夹输入框 -->
        <div
            v-if="showCreateInput"
            class="create-input-container"
            :style="{ paddingLeft: `${(level + 1) * 16 + 4}px` }"
        >
            <span class="node-icon">
                <span v-if="createType === 'folder'" class="folder-icon">📁</span>
                <span v-else class="file-icon">📄</span>
            </span>
            <input
                ref="createInput"
                v-model="newItemName"
                class="create-input"
                :placeholder="createType === 'folder' ? '文件夹名称' : '文件名称'"
                @blur="handleCreateInputBlur"
                @keyup.enter="handleCreateInputEnter"
                @keyup.esc="cancelCreate"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { FileTreeNode } from '../CodeIDE.vue'

interface Props {
    node: FileTreeNode
    level: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
    select: [node: FileTreeNode]
    'create-file': [parentPath: string, fileName: string]
    'create-folder': [parentPath: string, folderName: string]
    delete: [node: FileTreeNode]
    'drag-start': [node: FileTreeNode]
    'drag-over': [event: DragEvent, node: FileTreeNode]
    drop: [node: FileTreeNode]
}>()

const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const showCreateInput = ref(false)
const createType = ref<'file' | 'folder'>('file')
const newItemName = ref('')
const createInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

// 切换展开/折叠
const toggleExpand = () => {
    if (props.node.type === 'folder') {
        props.node.expanded = !props.node.expanded
    }
}

// 点击节点
const handleClick = () => {
    emit('select', props.node)
}

// 双击节点
const handleDoubleClick = () => {
    if (props.node.type === 'folder') {
        toggleExpand()
    } else {
        emit('select', props.node)
    }
}

// 右键菜单
const handleContextMenu = (event: MouseEvent) => {
    showContextMenu.value = true
    contextMenuX.value = event.clientX
    contextMenuY.value = event.clientY
    
    // 点击其他地方关闭菜单
    const closeMenu = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.context-menu')) {
            showContextMenu.value = false
            document.removeEventListener('click', closeMenu)
        }
    }
    nextTick(() => {
        document.addEventListener('click', closeMenu)
    })
}

// 创建文件
const handleCreateFile = () => {
    showContextMenu.value = false
    showCreateInput.value = true
    createType.value = 'file'
    newItemName.value = ''
    nextTick(() => {
        createInput.value?.focus()
    })
}

// 创建文件夹
const handleCreateFolder = () => {
    showContextMenu.value = false
    showCreateInput.value = true
    createType.value = 'folder'
    newItemName.value = ''
    nextTick(() => {
        createInput.value?.focus()
    })
}

// 删除
const handleDelete = () => {
    showContextMenu.value = false
    emit('delete', props.node)
}

// 创建输入框失焦
const handleCreateInputBlur = () => {
    if (newItemName.value.trim()) {
        if (createType.value === 'file') {
            emit('create-file', props.node.path, newItemName.value.trim())
        } else {
            emit('create-folder', props.node.path, newItemName.value.trim())
        }
    }
    showCreateInput.value = false
    newItemName.value = ''
}

// 创建输入框回车
const handleCreateInputEnter = () => {
    if (newItemName.value.trim()) {
        if (createType.value === 'file') {
            emit('create-file', props.node.path, newItemName.value.trim())
        } else {
            emit('create-folder', props.node.path, newItemName.value.trim())
        }
    }
    showCreateInput.value = false
    newItemName.value = ''
}

// 取消创建
const cancelCreate = () => {
    showCreateInput.value = false
    newItemName.value = ''
}

// 拖拽开始
const handleDragStart = (event: DragEvent) => {
    isDragging.value = true
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', props.node.path)
    }
    emit('drag-start', props.node)
}

// 拖拽悬停
const handleDragOver = (event: DragEvent) => {
    if (props.node.type === 'folder') {
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move'
        }
        emit('drag-over', event, props.node)
    }
}

// 拖拽放下
const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (props.node.type === 'folder') {
        emit('drop', props.node)
    }
}

// 拖拽结束
const handleDragEnd = () => {
    isDragging.value = false
}
</script>

<style scoped>
.file-tree-node {
    user-select: none;
}

.node-item {
    display: flex;
    align-items: center;
    padding: 2px 4px;
    cursor: pointer;
    font-size: 13px;
    line-height: 22px;
    transition: background-color 0.1s;
}

.node-item:hover {
    background-color: #2a2d2e;
}

.node-item.selected {
    background-color: #094771;
}

.node-item.dragging {
    opacity: 0.5;
}

.node-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    font-size: 14px;
    flex-shrink: 0;
}

.node-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #cccccc;
}

.node-children {
    display: block;
}

.context-menu {
    position: fixed;
    background-color: #3c3c3c;
    border: 1px solid #454545;
    border-radius: 3px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    min-width: 150px;
    padding: 4px 0;
}

.context-menu-item {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 13px;
    color: #cccccc;
    transition: background-color 0.1s;
}

.context-menu-item:hover {
    background-color: #094771;
}

.context-menu-item.danger {
    color: #f48771;
}

.context-menu-item.danger:hover {
    background-color: #5a1d1d;
}

.menu-icon {
    margin-right: 8px;
    font-size: 14px;
}

.context-menu-divider {
    height: 1px;
    background-color: #454545;
    margin: 4px 0;
}

.create-input-container {
    display: flex;
    align-items: center;
    padding: 2px 4px;
    font-size: 13px;
}

.create-input {
    flex: 1;
    background-color: #3c3c3c;
    border: 1px solid #007acc;
    color: #cccccc;
    padding: 2px 4px;
    font-size: 13px;
    outline: none;
    border-radius: 2px;
    margin-left: 4px;
}

.create-input:focus {
    border-color: #007acc;
    box-shadow: 0 0 0 1px #007acc;
}
</style>
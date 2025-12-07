<template>
    <div class="main-container">
        <div class="code-file-tree">
            <div class="file-tree-header">
                <span class="file-tree-title">文件资源管理器</span>
            </div>
            <div class="file-tree-content">
                <FileTreeNode
                    v-for="item in fileTree"
                    :key="item.path"
                    :node="item"
                    :level="0"
                    @select="handleNodeSelect"
                    @create-file="handleCreateFile"
                    @create-folder="handleCreateFolder"
                    @delete="handleDelete"
                    @rename="handleRename"
                    @drag-start="handleDragStart"
                    @drag-over="handleDragOver"
                    @drop="handleDrop"
                />
            </div>
        </div>
        <div class="code-ide-container">
            <div ref="editorContainer" class="monaco-editor"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { MonacoLanguageClient } from 'monaco-languageclient'
import { CloseAction, ErrorAction } from 'vscode-languageclient'
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc'
import { createUrl } from 'monaco-languageclient/common'
import 'vscode/localExtensionHost';
import FileTreeNode from './components/FileTreeNode.vue'

// 文件树节点类型定义
export interface FileTreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: FileTreeNode[]
    expanded?: boolean
    selected?: boolean
}

// 文件树数据
const fileTree = ref<FileTreeNode[]>([])
const draggedNode = ref<FileTreeNode | null>(null)

// 初始化文件树（示例数据，实际应该从接口获取）
const initFileTree = async () => {
    // TODO: 调用接口获取文件树数据
    // const tree = await fetchFileTree()
    // fileTree.value = tree
    
    // 示例数据
    fileTree.value = [
        {
            name: 'src',
            path: '/src',
            type: 'folder',
            expanded: true,
            children: [
                {
                    name: 'main.py',
                    path: '/src/main.py',
                    type: 'file'
                },
                {
                    name: 'utils',
                    path: '/src/utils',
                    type: 'folder',
                    children: [
                        {
                            name: 'helper.py',
                            path: '/src/utils/helper.py',
                            type: 'file'
                        }
                    ]
                }
            ]
        }
    ]
    
    // 初始化后排序
    sortFileTree(fileTree.value)
}

// ========== 文件树工具函数 ==========

/**
 * 在文件树中查找节点
 * @param nodes 节点数组
 * @param path 节点路径
 * @returns 找到的节点和其父节点数组，如果没找到返回 null
 */
const findNodeInTree = (
    nodes: FileTreeNode[],
    path: string
): { node: FileTreeNode; parent: FileTreeNode | null; parentArray: FileTreeNode[] } | null => {
    for (const node of nodes) {
        if (node.path === path) {
            return { node, parent: null, parentArray: nodes }
        }
        if (node.children) {
            const result = findNodeInTree(node.children, path)
            if (result) {
                if (result.parent === null) {
                    result.parent = node
                }
                return result
            }
        }
    }
    return null
}

/**
 * 在文件树中查找父节点
 * @param nodes 节点数组
 * @param path 子节点路径
 * @returns 父节点和父节点的子数组，如果没找到返回 null
 */
const findParentNode = (
    nodes: FileTreeNode[],
    path: string
): { parent: FileTreeNode; children: FileTreeNode[] } | null => {
    for (const node of nodes) {
        if (node.path === path) {
            return { parent: node, children: node.children || [] }
        }
        if (node.children) {
            for (const child of node.children) {
                if (child.path === path) {
                    return { parent: node, children: node.children }
                }
            }
            const result = findParentNode(node.children, path)
            if (result) {
                return result
            }
        }
    }
    return null
}

/**
 * 在文件树中查找指定路径的节点
 * @param nodes 节点数组
 * @param path 节点路径
 * @returns 找到的节点，如果没找到返回 null
 */
const findNodeByPath = (nodes: FileTreeNode[], path: string): FileTreeNode | null => {
    for (const node of nodes) {
        if (node.path === path) {
            return node
        }
        if (node.children) {
            const result = findNodeByPath(node.children, path)
            if (result) {
                return result
            }
        }
    }
    return null
}

/**
 * 从文件树中删除节点
 * @param nodes 节点数组
 * @param path 要删除的节点路径
 * @returns 是否成功删除
 */
const removeNodeFromTree = (nodes: FileTreeNode[], path: string): boolean => {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].path === path) {
            nodes.splice(i, 1)
            return true
        }
        if (nodes[i].children) {
            if (removeNodeFromTree(nodes[i].children!, path)) {
                return true
            }
        }
    }
    return false
}

/**
 * 更新节点及其子节点的路径
 * @param node 节点
 * @param newPath 新路径
 */
const updateNodePath = (node: FileTreeNode, newPath: string) => {
    const oldPath = node.path
    node.path = newPath
    
    // 更新子节点的路径
    if (node.children) {
        node.children.forEach(child => {
            const childName = child.path.substring(oldPath.length)
            updateNodePath(child, newPath + childName)
        })
    }
}

/**
 * 检查路径下是否存在同名文件/文件夹
 * @param parentPath 父路径（目标文件夹的路径）
 * @param name 名称
 * @returns 是否存在
 */
const checkNameExists = (parentPath: string, name: string): boolean => {
    if (parentPath === '/') {
        // 根节点
        return fileTree.value.some(node => node.name === name)
    }
    const targetFolder = findNodeByPath(fileTree.value, parentPath)
    if (!targetFolder || targetFolder.type !== 'folder') {
        return false
    }
    return (targetFolder.children || []).some(node => node.name === name)
}

/**
 * 生成唯一名称（如果名称已存在，添加数字后缀）
 * @param parentPath 父路径
 * @param name 原始名称
 * @returns 唯一名称
 */
const generateUniqueName = (parentPath: string, name: string): string => {
    if (!checkNameExists(parentPath, name)) {
        return name
    }
    
    let counter = 1
    let uniqueName = name
    const nameParts = name.split('.')
    const hasExtension = nameParts.length > 1
    const baseName = hasExtension ? nameParts.slice(0, -1).join('.') : name
    const extension = hasExtension ? '.' + nameParts[nameParts.length - 1] : ''
    
    while (checkNameExists(parentPath, uniqueName)) {
        uniqueName = `${baseName} (${counter})${extension}`
        counter++
    }
    
    return uniqueName
}

/**
 * 排序文件树节点（文件夹在前，文件在后，同类型按名称排序）
 * @param nodes 节点数组
 */
const sortFileTree = (nodes: FileTreeNode[]) => {
    // 递归排序子节点
    nodes.forEach(node => {
        if (node.children) {
            sortFileTree(node.children)
        }
    })
    
    // 排序当前层级：文件夹在前，文件在后，同类型按名称排序（不区分大小写）
    nodes.sort((a, b) => {
        // 先按类型排序：folder < file
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1
        }
        // 同类型按名称排序（不区分大小写）
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
}

// 节点选择处理
const handleNodeSelect = (node: FileTreeNode) => {
    // 取消所有节点的选中状态
    const unselectAll = (nodes: FileTreeNode[]) => {
        nodes.forEach(n => {
            n.selected = false
            if (n.children) {
                unselectAll(n.children)
            }
        })
    }
    unselectAll(fileTree.value)
    
    // 选中当前节点
    node.selected = true
    
    // TODO: 如果是文件，打开文件内容
    if (node.type === 'file') {
        // await openFile(node.path)
    }
}

// 创建文件
const handleCreateFile = (parentPath: string, fileName: string) => {
    if (!fileName || !fileName.trim()) {
        return
    }
    
    // 生成唯一名称
    const uniqueName = generateUniqueName(parentPath, fileName.trim())
    
    // 构建新文件路径
    const newPath = parentPath === '/' 
        ? `/${uniqueName}` 
        : `${parentPath}/${uniqueName}`
    
    // 创建新文件节点
    const newNode: FileTreeNode = {
        name: uniqueName,
        path: newPath,
        type: 'file'
    }
    
    // 查找目标文件夹（parentPath 就是目标文件夹的路径）
    if (parentPath === '/') {
        // 添加到根节点
        fileTree.value.push(newNode)
        sortFileTree(fileTree.value)
    } else {
        const targetFolder = findNodeByPath(fileTree.value, parentPath)
        if (targetFolder && targetFolder.type === 'folder') {
            if (!targetFolder.children) {
                targetFolder.children = []
            }
            targetFolder.children.push(newNode)
            // 确保父文件夹展开
            targetFolder.expanded = true
            // 排序子节点
            sortFileTree([targetFolder])
        } else {
            console.error('找不到目标文件夹或目标不是文件夹:', parentPath)
            return
        }
    }
    
    // 选中新创建的文件
    nextTick(() => {
        // 先取消所有节点的选中状态
        const unselectAll = (nodes: FileTreeNode[]) => {
            nodes.forEach(n => {
                n.selected = false
                if (n.children) {
                    unselectAll(n.children)
                }
            })
        }
        unselectAll(fileTree.value)
        
        // 选中新创建的文件
        newNode.selected = true
    })
}

// 创建目录
const handleCreateFolder = (parentPath: string, folderName: string) => {
    if (!folderName || !folderName.trim()) {
        return
    }
    
    // 生成唯一名称
    const uniqueName = generateUniqueName(parentPath, folderName.trim())
    
    // 构建新文件夹路径
    const newPath = parentPath === '/' 
        ? `/${uniqueName}` 
        : `${parentPath}/${uniqueName}`
    
    // 创建新文件夹节点
    const newNode: FileTreeNode = {
        name: uniqueName,
        path: newPath,
        type: 'folder',
        expanded: true,
        children: []
    }
    
    // 查找目标文件夹（parentPath 就是目标文件夹的路径）
    if (parentPath === '/') {
        // 添加到根节点
        fileTree.value.push(newNode)
        sortFileTree(fileTree.value)
    } else {
        const targetFolder = findNodeByPath(fileTree.value, parentPath)
        if (targetFolder && targetFolder.type === 'folder') {
            if (!targetFolder.children) {
                targetFolder.children = []
            }
            targetFolder.children.push(newNode)
            // 确保父文件夹展开
            targetFolder.expanded = true
            // 排序子节点
            sortFileTree([targetFolder])
        } else {
            console.error('找不到目标文件夹或目标不是文件夹:', parentPath)
            return
        }
    }
    
    // 选中新创建的文件夹
    nextTick(() => {
        // 先取消所有节点的选中状态
        const unselectAll = (nodes: FileTreeNode[]) => {
            nodes.forEach(n => {
                n.selected = false
                if (n.children) {
                    unselectAll(n.children)
                }
            })
        }
        unselectAll(fileTree.value)
        
        // 选中新创建的文件夹
        newNode.selected = true
    })
}

// 删除文件/目录
const handleDelete = (node: FileTreeNode) => {
    // 从文件树中删除节点
    const removed = removeNodeFromTree(fileTree.value, node.path)
    
    if (!removed) {
        console.error('删除失败，找不到节点:', node.path)
        return
    }
    
    // 取消选中状态
    node.selected = false
}

// 重命名文件/目录
const handleRename = (node: FileTreeNode, newName: string) => {
    if (!newName || !newName.trim()) {
        return
    }
    
    const trimmedName = newName.trim()
    
    // 获取父路径
    const parentPath = node.path.substring(0, node.path.lastIndexOf('/')) || '/'
    
    // 检查新名称是否已存在（排除当前节点）
    const parent = findParentNode(fileTree.value, node.path)
    if (parent) {
        const nameExists = parent.children.some(
            child => child.name === trimmedName && child.path !== node.path
        )
        if (nameExists) {
            console.warn('名称已存在:', trimmedName)
            return
        }
    } else {
        // 根节点
        const nameExists = fileTree.value.some(
            child => child.name === trimmedName && child.path !== node.path
        )
        if (nameExists) {
            console.warn('名称已存在:', trimmedName)
            return
        }
    }
    
    // 构建新路径
    const newPath = parentPath === '/' 
        ? `/${trimmedName}` 
        : `${parentPath}/${trimmedName}`
    
    // 更新节点名称和路径
    node.name = trimmedName
    updateNodePath(node, newPath)
    
    // 重命名后可能需要重新排序（使用旧路径查找父节点）
    if (parentPath === '/') {
        sortFileTree(fileTree.value)
    } else {
        const parent = findParentNode(fileTree.value, newPath)
        if (parent && parent.parent.children) {
            sortFileTree([parent.parent])
        }
    }
}

// 拖拽开始
const handleDragStart = (node: FileTreeNode) => {
    draggedNode.value = node
}

// 拖拽悬停
const handleDragOver = (event: DragEvent, targetNode: FileTreeNode) => {
    if (draggedNode.value && draggedNode.value.path !== targetNode.path) {
        event.preventDefault()
        event.dataTransfer!.dropEffect = 'move'
    }
}

// 拖拽放下
const handleDrop = (targetNode: FileTreeNode) => {
    if (!draggedNode.value || draggedNode.value.path === targetNode.path) {
        draggedNode.value = null
        return
    }
    
    // 不能拖拽到文件上，只能拖拽到文件夹
    if (targetNode.type !== 'folder') {
        draggedNode.value = null
        return
    }
    
    // 检查是否尝试将节点拖拽到自己的子节点中（防止循环）
    const isDescendant = (parent: FileTreeNode, childPath: string): boolean => {
        if (parent.path === childPath) {
            return true
        }
        if (parent.children) {
            return parent.children.some(child => isDescendant(child, childPath))
        }
        return false
    }
    
    if (isDescendant(draggedNode.value, targetNode.path)) {
        console.warn('不能将节点移动到自己的子节点中')
        draggedNode.value = null
        return
    }
    
    // 查找要移动的节点
    const sourceResult = findNodeInTree(fileTree.value, draggedNode.value.path)
    if (!sourceResult) {
        console.error('找不到要移动的节点:', draggedNode.value.path)
        draggedNode.value = null
        return
    }
    
    // 从原位置删除
    const removed = removeNodeFromTree(fileTree.value, draggedNode.value.path)
    if (!removed) {
        console.error('删除源节点失败')
        draggedNode.value = null
        return
    }
    
    // 生成新的路径和名称（如果目标文件夹中已有同名文件，生成唯一名称）
    const newName = generateUniqueName(targetNode.path, sourceResult.node.name)
    const newPath = targetNode.path === '/' 
        ? `/${newName}` 
        : `${targetNode.path}/${newName}`
    
    // 更新节点路径
    sourceResult.node.name = newName
    updateNodePath(sourceResult.node, newPath)
    
    // 添加到新位置
    if (!targetNode.children) {
        targetNode.children = []
    }
    targetNode.children.push(sourceResult.node)
    
    // 排序目标文件夹的子节点
    sortFileTree([targetNode])
    
    // 确保目标文件夹展开
    targetNode.expanded = true
    
    // 清除拖拽状态
    draggedNode.value = null
}

// 配置 Monaco Editor 的 Web Workers
;(self as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
        if (label === 'json') {
            return new jsonWorker()
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker()
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker()
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker()
        }
        return new editorWorker()
    }
}

const editorContainer = ref<HTMLDivElement | null>(null)
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null
let languageClient: MonacoLanguageClient | null = null

// 默认 Python 代码内容
const defaultCode = `# 欢迎使用 Python IDE
def hello():
    print('Hello, Python!')

hello()
`

const LSP_WS_URL = createUrl({
    secured: false,
    host: 'localhost',
    port: 3001,
    path: 'pyright',
    extraParams: {
        authorization: 'UserAuth'
    }
})


// 初始化 LSP 连接
const initLSP = async () => {
    if (!editorInstance) return

    try {
        // 创建 WebSocket 连接
        // 如果后端要求子协议，需要在第二个参数中指定
        // 如果后端不要求子协议，可以传入空数组 []
        console.log(1)
        const webSocket = new WebSocket(LSP_WS_URL)
        console.log(webSocket)
        webSocket.onopen = () => {
            console.log('LSP WebSocket 连接已建立')
            
            // 创建消息连接
            const socket = toSocket(webSocket)
            const reader = new WebSocketMessageReader(socket)
            const writer = new WebSocketMessageWriter(socket)
            
            console.log('LSP WebSocket 连接已建立2')
            // 创建语言客户端
            languageClient = new MonacoLanguageClient({
                name: 'Python Language Client',
                id: 'python',
                clientOptions: {
                    // 文档选择器：只对 Python 文件启用
                    documentSelector: [{ scheme: 'file', language: 'python' }],
                    // 错误处理
                    errorHandler: {
                        error: () => ({ action: ErrorAction.Continue }),
                        closed: () => ({ action: CloseAction.DoNotRestart })
                    },
                    // 工作区文件夹
                    workspaceFolder: {
                        index: 0,
                        name: 'workspace',
                        uri: monaco.Uri.parse('/')
                    },
                    // 同步选项
                    synchronize: {
                        fileEvents: []
                    }
                },
                // 消息传输
                messageTransports: {
                    reader,
                    writer
                }
            })

            console.log('LSP WebSocket 连接已建立3')
            // 启动语言客户端
            languageClient.start()
            
            console.log('Python LSP 客户端已启动')
        }
        
        webSocket.onerror = (error) => {
            console.error('LSP WebSocket 连接错误:', error)
            console.warn('提示: 请确保 LSP 服务器正在运行并监听在', LSP_WS_URL)
        }
        
        webSocket.onclose = () => {
            console.log('LSP WebSocket 连接已关闭')
        }
        
    } catch (error) {
        console.error('初始化 LSP 连接失败:', error)
        console.warn('提示: 请确保 LSP 服务器正在运行')
    }
}

onMounted(async () => {
    // 初始化文件树
    await initFileTree()
    
    if (editorContainer.value) {
        // 创建 Monaco Editor 实例
        editorInstance = monaco.editor.create(editorContainer.value, {
            value: defaultCode,
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            minimap: {
                enabled: true
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 4, // Python 通常使用 4 个空格
            insertSpaces: true,
            // 启用代码补全
            quickSuggestions: {
                other: true,
                comments: true,
                strings: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'off'
        })

        // 监听窗口大小变化，自动调整编辑器大小
        window.addEventListener('resize', handleResize)
        
        // 等待编辑器完全初始化后再初始化 LSP 连接
        await nextTick()
        // 额外等待一小段时间确保 Monaco 服务已准备好
        await new Promise(resolve => setTimeout(resolve, 100))
        await initLSP()
    }
})

onBeforeUnmount(() => {
    // 清理事件监听器
    window.removeEventListener('resize', handleResize)
    
    // 停止并清理语言客户端
    if (languageClient) {
        languageClient.stop()
        languageClient = null
    }
    
    // 销毁编辑器实例
    if (editorInstance) {
        editorInstance.dispose()
        editorInstance = null
    }
})

const handleResize = () => {
    if (editorInstance) {
        editorInstance.layout()
    }
}

// 暴露编辑器实例，方便父组件调用
defineExpose({
    getEditor: () => editorInstance,
    getValue: () => editorInstance?.getValue(),
    setValue: (value: string) => editorInstance?.setValue(value),
    setLanguage: (language: string) => {
        if (editorInstance) {
            monaco.editor.setModelLanguage(editorInstance.getModel()!, language)
        }
    },
    getLanguageClient: () => languageClient
})
</script>

<style scoped>

.main-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
}

.code-file-tree {
    width: 100%;
    height: 100%;
    flex: 0 0 250px;
    background-color: #252526;
    color: #cccccc;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #3e3e42;
    overflow: hidden;
}

.file-tree-header {
    padding: 8px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    user-select: none;
}

.file-tree-title {
    color: #cccccc;
}

.file-tree-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 0;
}

.file-tree-content::-webkit-scrollbar {
    width: 10px;
}

.file-tree-content::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.file-tree-content::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
}

.file-tree-content::-webkit-scrollbar-thumb:hover {
    background: #4e4e4e;
}

.code-ide-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
}

.monaco-editor {
    width: 100%;
    height: 100%;
    min-height: 400px;
}
</style>
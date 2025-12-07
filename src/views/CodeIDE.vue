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
const handleCreateFile = async (parentPath: string, fileName: string) => {
    // TODO: 调用接口创建文件
    // await createFile(parentPath, fileName)
    // 重新加载文件树
    // await initFileTree()
    
    console.log('创建文件:', parentPath, fileName)
}

// 创建目录
const handleCreateFolder = async (parentPath: string, folderName: string) => {
    // TODO: 调用接口创建目录
    // await createFolder(parentPath, folderName)
    // 重新加载文件树
    // await initFileTree()
    
    console.log('创建目录:', parentPath, folderName)
}

// 删除文件/目录
const handleDelete = async (node: FileTreeNode) => {
    // TODO: 调用接口删除文件/目录
    // await deleteFileOrFolder(node.path)
    // 重新加载文件树
    // await initFileTree()
    
    console.log('删除:', node.path)
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
const handleDrop = async (targetNode: FileTreeNode) => {
    if (!draggedNode.value || draggedNode.value.path === targetNode.path) {
        return
    }
    
    // 不能拖拽到文件上，只能拖拽到文件夹
    if (targetNode.type !== 'folder') {
        return
    }
    
    // TODO: 调用接口移动文件/目录
    // await moveFileOrFolder(draggedNode.value.path, targetNode.path)
    // 重新加载文件树
    // await initFileTree()
    
    console.log('移动:', draggedNode.value.path, '到', targetNode.path)
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
<template>
    <div class="code-ide-container">
        <div ref="editorContainer" class="monaco-editor"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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

// 默认代码内容
const defaultCode = `// 欢迎使用 Monaco Editor
function hello() {
    console.log('Hello, Monaco Editor!')
}

hello()
`

onMounted(() => {
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
            tabSize: 2,
            insertSpaces: true
        })

        // 监听窗口大小变化，自动调整编辑器大小
        window.addEventListener('resize', handleResize)
    }
})

onBeforeUnmount(() => {
    // 清理事件监听器
    window.removeEventListener('resize', handleResize)
    
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
    }
})
</script>

<style scoped>
.code-ide-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.monaco-editor {
    width: 100%;
    height: 100%;
    min-height: 400px;
}
</style>
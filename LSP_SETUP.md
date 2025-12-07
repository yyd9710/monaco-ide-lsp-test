# Python LSP 服务器配置指南

本文档说明如何为 `CodeIDE.vue` 中的 Python IDE 配置 LSP 服务器以实现代码补全功能。

## 概述

当前实现通过 WebSocket 连接到后端 LSP 服务器。默认连接地址为 `ws://localhost:3001/python`，可通过环境变量 `VITE_LSP_WS_URL` 进行配置。

## 方案一：使用 Python LSP Server (pylsp)

### 1. 安装 Python LSP Server

```bash
pip install python-lsp-server[all]
```

### 2. 创建 WebSocket 服务器

创建一个 Python 脚本来运行 LSP 服务器并通过 WebSocket 暴露：

```python
# lsp_server.py
import asyncio
import json
import websockets
from pylsp_jsonrpc import streams
from pylsp.python_lsp import PythonLSPServer

async def handle_client(websocket, path):
    """处理 WebSocket 连接"""
    # 创建 LSP 服务器实例
    server = PythonLSPServer()
    
    # 创建 JSON-RPC 流
    reader, writer = await streams.create_streams(websocket)
    
    # 启动 LSP 服务器
    await server.start(reader, writer)

async def main():
    """启动 WebSocket 服务器"""
    server = await websockets.serve(
        handle_client,
        "localhost",
        3001,
        subprotocols=["python"]
    )
    print("LSP WebSocket 服务器运行在 ws://localhost:3001/python")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. 运行服务器

```bash
python lsp_server.py
```

## 方案二：使用 Pyright

### 1. 安装 Pyright

```bash
npm install -g pyright
```

### 2. 创建 WebSocket 代理服务器

由于 Pyright 使用 stdio，需要创建一个 WebSocket 代理：

```javascript
// lsp-proxy.js
const WebSocket = require('ws');
const { spawn } = require('child_process');

const wss = new WebSocket.Server({ port: 3001, path: '/python' });

wss.on('connection', (ws) => {
    console.log('客户端已连接');
    
    // 启动 Pyright 语言服务器
    const pyright = spawn('pyright-langserver', ['--stdio'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // 将 WebSocket 消息转发到 Pyright
    ws.on('message', (message) => {
        pyright.stdin.write(message);
    });
    
    // 将 Pyright 输出转发到 WebSocket
    pyright.stdout.on('data', (data) => {
        ws.send(data);
    });
    
    pyright.stderr.on('data', (data) => {
        console.error('Pyright 错误:', data.toString());
    });
    
    // 清理
    ws.on('close', () => {
        pyright.kill();
    });
    
    pyright.on('close', () => {
        ws.close();
    });
});

console.log('LSP WebSocket 代理运行在 ws://localhost:3001/python');
```

### 3. 运行代理服务器

```bash
node lsp-proxy.js
```

## 方案三：使用 Node.js + Language Server Protocol

### 1. 安装依赖

```bash
npm install vscode-languageserver websocket
```

### 2. 创建 WebSocket LSP 服务器

```javascript
// python-lsp-server.js
const { WebSocketServer } = require('ws');
const { createConnection, createServer } = require('vscode-languageserver/node');

const wss = new WebSocketServer({ port: 3001, path: '/python' });

wss.on('connection', (ws) => {
    console.log('客户端已连接');
    
    // 创建 LSP 连接
    const connection = createConnection(
        new WebSocketMessageReader(ws),
        new WebSocketMessageWriter(ws)
    );
    
    // 创建语言服务器
    const server = createServer(connection);
    
    // 启动服务器
    connection.listen();
    server.start();
});

console.log('Python LSP 服务器运行在 ws://localhost:3001/python');
```

## 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# LSP WebSocket 服务器地址
VITE_LSP_WS_URL=ws://localhost:3001/python

# LSP WebSocket 子协议（可选）
# 如果后端要求子协议，设置为子协议名称，多个用逗号分隔
# 如果后端不要求子协议，可以省略或设置为空
VITE_LSP_SUBPROTOCOLS=python
```

或者根据实际情况修改：

```env
VITE_LSP_WS_URL=ws://your-server:port/path
VITE_LSP_SUBPROTOCOLS=python
```

**注意**：如果后端服务器配置了 `subprotocols`（如 `subprotocols=["python"]`），前端必须提供匹配的子协议，否则会出现 `NegotiationError: missing subprotocol` 错误。

## 测试连接

1. 启动 LSP 服务器
2. 启动前端开发服务器：`npm run dev`
3. 打开浏览器控制台，查看是否有 "LSP WebSocket 连接已建立" 的日志
4. 在编辑器中输入 Python 代码，测试代码补全功能

## 故障排除

### 连接失败

- 检查 LSP 服务器是否正在运行
- 检查 WebSocket 地址是否正确
- 查看浏览器控制台的错误信息

### `NegotiationError: missing subprotocol` 错误

这个错误表示后端服务器要求 WebSocket 子协议，但前端没有提供。

**解决方案有两种：**

1. **修改前端配置**（推荐）：
   - 如果后端要求子协议（如 `python`），在 `.env` 文件中设置：
     ```env
     VITE_LSP_SUBPROTOCOLS=python
     ```
   - 如果后端不要求子协议，在 `.env` 文件中设置为空：
     ```env
     VITE_LSP_SUBPROTOCOLS=
     ```

2. **修改后端配置**：
   - 如果后端使用 `websockets` 库，移除 `subprotocols` 参数：
     ```python
     # 修改前
     server = await websockets.serve(
         handle_client,
         "localhost",
         3001,
         subprotocols=["python"]  # 移除这一行
     )
     
     # 修改后
     server = await websockets.serve(
         handle_client,
         "localhost",
         3001
     )
     ```
   - 或者将 `subprotocols` 设置为 `None` 或空列表，使其可选

### 代码补全不工作

- 确认 LSP 服务器已正确启动
- 检查浏览器控制台是否有错误
- 确认文档选择器配置正确（当前配置为 Python 语言）

### 性能问题

- 考虑使用本地 LSP 服务器而不是远程服务器
- 检查网络延迟
- 优化 LSP 服务器配置

## 注意事项

1. **安全性**：在生产环境中，请确保 WebSocket 连接使用 WSS (WebSocket Secure)
2. **CORS**：如果 LSP 服务器运行在不同的域名，需要配置 CORS
3. **资源消耗**：LSP 服务器可能会消耗较多资源，请根据实际情况调整

## 参考资源

- [Language Server Protocol 规范](https://microsoft.github.io/language-server-protocol/)
- [Monaco Language Client](https://github.com/TypeFox/monaco-languageclient)
- [Python LSP Server](https://github.com/python-lsp/python-lsp-server)
- [Pyright](https://github.com/microsoft/pyright)


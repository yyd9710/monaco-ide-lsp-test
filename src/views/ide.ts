import * as vscode from 'vscode';
// Import Monaco Language Client components
import { EditorApp, type EditorAppConfig } from 'monaco-languageclient/editorApp';
import { configureDefaultWorkerFactory } from 'monaco-languageclient/workerFactory';
import { MonacoVscodeApiWrapper, type MonacoVscodeApiConfig } from 'monaco-languageclient/vscodeApiWrapper';
import { LanguageClientWrapper, type LanguageClientConfig } from 'monaco-languageclient/lcwrapper';

async function createEditorAndLanguageClient() {
    const languageId = 'python';
    const code = '// initial editor content';
    const codeUri = '/workspace/hello.py';

    // Monaco VSCode API configuration
    const vscodeApiConfig: MonacoVscodeApiConfig = {
        $type: 'extended',
        viewsConfig: {
            $type: 'EditorService'
        },
        userConfiguration: {
            json: JSON.stringify({
                'workbench.colorTheme': 'Default Dark Modern',
                'editor.wordBasedSuggestions': 'off'
            })
        },
        monacoWorkerFactory: configureDefaultWorkerFactory
    };

    // Language client configuration
    const languageClientConfig: LanguageClientConfig = {
        languageId: languageId,
        connection: {
            options: {
                $type: 'WebSocketUrl',
                // at this url the language server for myLang must be reachable
                url: 'ws://localhost:30001/pyright'
            }
        },
        clientOptions: {
            documentSelector: [languageId],
            orkspaceFolder: {
                index: 0,
                name: 'workspace',
                uri: vscode.Uri.file('/workspace')
            }
        }
    };

    // editor app / monaco-editor configuration
    const editorAppConfig: EditorAppConfig = {
        codeResources: {
            main: {
                text: code,
                uri: codeUri
            }
        }
    };

    // Create the monaco-vscode api Wrapper and start it before anything else
    const apiWrapper = new MonacoVscodeApiWrapper(vscodeApiConfig);
    await apiWrapper.start();

    // Create language client wrapper
    const lcWrapper = new LanguageClientWrapper(languageClientConfig);
    await lcWrapper.start();

    // Create and start the editor app
    const editorApp = new EditorApp(editorAppConfig);
    const htmlContainer = document.getElementById('monaco-editor-root')!;
    await editorApp.start(htmlContainer);
}

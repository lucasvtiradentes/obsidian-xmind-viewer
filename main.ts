import {ItemView, moment, Platform, Plugin, WorkspaceLeaf, TFile} from 'obsidian';

let iframe: HTMLIFrameElement | null = null;
let ready = false;

export const VIEW_TYPE_EXAMPLE = "mxmind-view";

export default class MxmindPlugin extends Plugin {

	async onload() {
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new MxmindIframeView(leaf)
		);
		const ribbonIconEl = this.addRibbonIcon('network', 'Mxmind', (evt: MouseEvent) => {
			this.toggleView();
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				//@ts-ignore
				const extension = file.extension as string
				if (!extension || extension !== 'xmind') return;
				if (!(file instanceof TFile)) return;
				menu.addItem((item) => {
					item
						.setTitle("Open as mindmap")
						.setIcon("document")
						.onClick(async () => {
							const content = await this.app.vault.cachedRead(file);
							const post = async () => {
								postIframeMessage('loadFromMd', [content]);
							}
							await this.activateView();
							waitEditor().then(post).catch(post);
						});
				});
			})
		);
		this.registerEvent(this.app.workspace.on("css-change", () => {
			postIframeMessage('setTheme', [getTheme()]);
		}));
	}

	onunload() {

	}

	async toggleView() {
		const {workspace} = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			leaf = leaves[0];
			this.toggleCollapseRight();
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({type: VIEW_TYPE_EXAMPLE, active: true});
		}
		if (leaf.getViewState().active) {
			iframe?.contentWindow?.postMessage({
				method: 'fullScreen',
				params: [],
			}, '*');
		}
	}

	async activateView() {
		const {workspace} = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);

		}
		await leaf.setViewState({type: VIEW_TYPE_EXAMPLE, active: true});
		workspace.revealLeaf(leaf);
		return leaf;

	}

	toggleCollapseRight() {
		const rightSplit = this.app.workspace.rightSplit;

		rightSplit.collapsed ? rightSplit.expand() : rightSplit.collapse();
	}
}


export class MxmindIframeView extends ItemView {
	navigation = false;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);

	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Mxmind";
	}

	arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.setAttribute('style', Platform.isMobile ? 'padding:0;overflow:hidden;' : 'padding:0;padding-bottom:30px;overflow:hidden;');

		const file = this.app.metadataCache.getFirstLinkpathDest("ferramentas/android/esquemas/android.xmind", "");
    if (!file) {
			console.error("XMind file not found.");
			return;
    }

    const arrayBuffer = await this.app.vault.readBinary(file);
    const base64 = this.arrayBufferToBase64(arrayBuffer);

		container.createEl("iframe", {
			cls: "mxmind-iframe",
			attr: {
				style: 'width:100%;height:90%',
				srcdoc: `<!DOCTYPE html>
				<html lang='en'>
				<head>
					<meta charset='UTF-8'>
					<meta name='viewport' content='width=device-width, initial-scale=1.0'>
					<title>Xmind Viewer</title>
					<script src='https://unpkg.com/xmind-embed-viewer/dist/umd/xmind-embed-viewer.js'></script>
				</head>
				<body>
					<div id='container'></div>
					<script>
						const viewer = new XMindEmbedViewer({ el: '#container' });
						viewer.load(atob(${JSON.stringify(base64)}));
					</script>
				</body>
				</html>`,
				frameborder: '0'
			}
		}, (el) => {
			iframe = el;
		});
		container.win.onmessage = (event: MessageEvent) => {
			if (event.data.event && event.data.event == 'editor-ready') {
				ready = true;
			}

		}
	}

	async onClose() {
		// Nothing to clean up.
	}
}

function waitEditor() {
	return new Promise((resolve, reject) => {
		if (ready) {
			resolve(true);
		} else {
			const t = new Date().getTime();
			const int = setInterval(() => {
				if (ready) {
					clearInterval(int);
					resolve(true);
				} else {
					if (new Date().getTime() - t > 10 * 1000) {
						clearInterval(int);
						reject(false);
					}
				}
			}, 100);
		}
	})
}

function postIframeMessage(method: string, params: Array<any>) {
	if (!iframe) return;
	iframe?.contentWindow?.postMessage({
		method,
		params
	}, '*');
}

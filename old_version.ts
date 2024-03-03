// https://github.com/webceoboy/mxmind-obsidian/blob/main/main.ts

import { App, Modal, Plugin, TFile } from 'obsidian';

export default class MyPlugin extends Plugin {
	onload() {
		this.registerExtensions(["xmind"], "markdown");

		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile) => {
				if (file.extension === "xmind") {
					new XmindModal(this.app, file, this.openXMind, this.viewLocally).open();
				}
			})
		);

	}

	openXMind(file: TFile) {
		const obsidianPath = this.app.vault.getResourcePath(file)
		const absolutePath = convertObsidianPathToAbsolute(obsidianPath);
    window.open(`file://${absolutePath}`)
	}

	async viewLocally(file: TFile) {
    const markdownContent = generateMarkdownContent(this.app, file);
    const newFile = await this.app.vault.create(file.path + '.md', markdownContent);
    await this.app.workspace.openLinkText(newFile.path, '');
}

}

class XmindModal extends Modal {
	constructor(app: App, private file: TFile, private openXMind: (file: TFile) => void, private viewLocally: (file: TFile) => void) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl("h2", {text: `O arquivo .xmind "${this.file.name}" foi clicado. O que você deseja fazer?`});

		const openButton = contentEl.createEl("button", {text: "Abrir XMind", cls: "mod-cta"});
		openButton.addEventListener("click", () => {
				this.openXMind(this.file);
				this.close();
		});

		const viewButton = contentEl.createEl("button", {text: "Visualizar Localmente"});
		viewButton.addEventListener("click", () => {
				this.viewLocally(this.file);
				this.close();
		});
	}

}

function convertObsidianPathToAbsolute(obsidianPath: string){
	const prefix = "app://";
	const parts = obsidianPath.substring(prefix.length).split("/");
	const pathComponents = "/" + parts.slice(1).join("/").split("?")[0]
	return pathComponents
}

function generateMarkdownContent(app: App, file: TFile): string {

	const obsidianPath = app.vault.getResourcePath(file)
	const absolutePath = convertObsidianPathToAbsolute(obsidianPath);

	const markdownContent = `
# Visualização do Arquivo Xmind

<iframe style='width: 100%; height: 600px; border: none;' sandbox='allow-scripts' srcdoc="
	<!DOCTYPE html>
	<html lang='en'>
	<head>
		<meta charset='UTF-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1.0'>
		<title>Xmind Viewer</title>
		<script src='https://unpkg.com/xmind-embed-viewer/dist/umd/xmind-embed-viewer.js'></script>
	</head>
	<body>
		<div id='container'></div>
		<p>funciona poha</p>
		<script>
			const viewer = new XMindEmbedViewer({ el: '#container' });
			fetch('${absolutePath}').then(res => res.arrayBuffer()).then(file => viewer.load(file)).catch(err => console.log(err))
		</script>
	</body>
	</html>
"></iframe>`;

	return markdownContent;
}

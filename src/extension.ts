// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import path from 'path';
	
const dasherize = (str: string) => {
	return str.replace(/[A-Z]/g, (char, index) => {
	  return (index !== 0 ? '-' : '') + char.toLowerCase();
	});
};

const classify = (str: string) => {
	return str
		.replace(/^./, str => str.toUpperCase())
		.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
};

const strToBlob = (str: string) => new Uint8Array(new TextEncoder().encode(str));

const writeStyles = async (textEditor: vscode.TextEditor, stylesFileName: vscode.Uri) => {
	const curStylesFileName = `${textEditor.document.fileName.split('.').slice(0, -1).join('.')}.scss`;
	const styles = await vscode.workspace.fs.readFile(vscode.Uri.file(`${curStylesFileName}`));

	if (curStylesFileName && styles) {
		await vscode.workspace.fs.writeFile(stylesFileName, styles);
	}
};

const prepareComponentCode = (classStr: string, options: {
	selector: string,
	templateUrl: string,
	styleUrl: string,
	className: string
}) => classStr.replace(/selector:.*,/, `selector: '${options.selector}',`)
	.replace(/templateUrl:.*,/, `templateUrl: '${options.templateUrl}',`)
	.replace(/styleUrls.*,/, `styleUrls: ['${options.styleUrl}'],`)
	.replace(/export class.*{/, `export class ${options.className}Component {`);


const writeComponentClass = async (textEditor: vscode.TextEditor, stylesFileName: vscode.Uri, nameDashed: string, name: string) => {
	const fileName = `${textEditor.document.fileName.split('.').slice(0, -1).join('.')}.ts`;
	const code = await vscode.workspace.fs.readFile(vscode.Uri.file(`${fileName}`));

	const classContent = prepareComponentCode(code.toString(), {
		selector: nameDashed,
		templateUrl: `./${nameDashed}.component.html`,
		styleUrl: `./${nameDashed}.component.scss`,
		className: classify(name)
	});

	if (fileName && code) {
		await vscode.workspace.fs.writeFile(stylesFileName, strToBlob(classContent));
	}
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ng-g-comp" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ng-g-comp.generate', async () => {
		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) {
			return;
		}
		const selection = textEditor.selection;
		const selectedText = textEditor.document.getText(selection);
		if (!selectedText) {
			return;
		}

		const name = await vscode.window.showInputBox({
			placeHolder: 'Enter new component name'
		});
	
		const nameDashed = dasherize(name as string);

		if (!name) {
			vscode.window.showErrorMessage('Component name cannot be empty');
			return;
		}

		const currentFileDir = path.dirname(textEditor.document.fileName);

		if (!currentFileDir) {
			vscode.window.showErrorMessage('Cant find current folder');
			return;
		}
	
		vscode.workspace.fs.createDirectory(vscode.Uri.file(`${currentFileDir}/${nameDashed}`));
		const componentFileName = vscode.Uri.file(`${currentFileDir}/${nameDashed}/${nameDashed}.component.ts`);
		const templateFileName = vscode.Uri.file(`${currentFileDir}/${nameDashed}/${nameDashed}.component.html`);
		const stylesFileName = vscode.Uri.file(`${currentFileDir}/${nameDashed}/${nameDashed}.component.scss`);
	
		await writeStyles(textEditor, stylesFileName);
		await writeComponentClass(textEditor, componentFileName, nameDashed, name);
		await vscode.workspace.fs.writeFile(templateFileName, strToBlob(selectedText));
	});

	context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}

import * as assert from 'node:assert';

import * as vscode from 'vscode';

const PUBLISHER = 'tallycode';
const NAME = 'tallycode';
const EXTENSION_ID = `${PUBLISHER}.${NAME}`;
const OPEN_DASHBOARD_COMMAND_ID = 'tallycode.openDashboard';
const TALLYCODE_COMMANDS = [
  'tallycode.openDashboard',
  'tallycode.countWorkspace',
  'tallycode.countDirectory',
  'tallycode.countFile',
  'tallycode.saveBaseline',
  'tallycode.clearBaseline',
  'tallycode.exportReport',
  'tallycode.statusBarMenu',
  'tallycode.tree.openHighlight',
];

describe('extension activation', function () {
  this.timeout(20000);

  it('extension is installed and discoverable', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} should be installed`);
  });

  it('activates without error', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    if (!ext.isActive)
      await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  it('registers every tallycode.* command', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive)
      await ext.activate();
    const commandIds = await vscode.commands.getCommands(true);
    for (const id of TALLYCODE_COMMANDS) {
      assert.ok(commandIds.includes(id), `Command ${id} not registered`);
    }
  });

  it('does not register the legacy showHelloWorld command', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive)
      await ext.activate();
    const commandIds = await vscode.commands.getCommands(true);
    assert.ok(
      !commandIds.includes('hello-world.showHelloWorld'),
      'legacy hello-world.showHelloWorld must not be registered',
    );
  });

  it('opening the dashboard does not throw', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext && !ext.isActive)
      await ext.activate();
    await vscode.commands.executeCommand(OPEN_DASHBOARD_COMMAND_ID);
    // The MainPanel.currentPanel singleton lives in extension code; we can't poke at it directly,
    // but invoking the command must not throw.
    assert.ok(true, 'command executed without throwing');
  });
});

describe('vscode API surface', function () {
  this.timeout(10000);

  it('window API is available', () => {
    assert.ok(vscode.window);
  });

  it('commands API is available', () => {
    assert.ok(vscode.commands);
  });

  it('extensions API is available', () => {
    assert.ok(vscode.extensions);
  });
});

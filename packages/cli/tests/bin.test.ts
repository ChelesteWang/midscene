import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { execa } from 'execa';
import { describe, expect, test, vi } from 'vitest';

const cliBin = require.resolve('../bin/midscene');
vi.setConfig({
  testTimeout: 30 * 1000,
});

describe('bin', () => {
  test('empty url', async () => {
    const params = [
      '--query',
      '{name: string, status: string}[], service status of github page',
      '--url',
    ];
    expect(async () => {
      await execa(cliBin, params);
    }).rejects.toThrowError();
  });

  test('query', async () => {
    const randomFileName = `status-${randomUUID()}.json`;
    const params = [
      '--url',
      'https://www.githubstatus.com/',
      '--output',
      randomFileName,
      '--aiQuery',
      '{name: string, status: string}[], service status of github page',
      '--aiQuery',
      'the name of the service, string[]',
    ];
    const { failed } = await execa(cliBin, params);
    expect(failed).toBe(false);

    expect(existsSync(randomFileName)).toBeTruthy();

    const jsonContent = JSON.parse(readFileSync(randomFileName, 'utf-8'));
    expect(jsonContent[0][0].name).toBeTruthy();
    expect(Array.isArray(jsonContent[1])).toBeTruthy();
    // console.log(jsonContent);
    unlinkSync(randomFileName);
  });

  test('serve mode', async () => {
    const params = [
      '--serve',
      './tests/server_root',
      '--url',
      'index.html',
      '--aiAssert',
      'the content title is "My App"',
    ];
    await execa(cliBin, params);
  });

  test('serve mode, exit with error', async () => {
    const params = [
      '--serve',
      './tests/server_root',
      '--url',
      'index.html',
      '--aiAssert',
      'the content title is "Ebay"',
    ];
    expect(async () => {
      await execa(cliBin, params);
      console.log('done');
    }).rejects.toThrowError();
  });

  test('serve mode--headed', async () => {
    const params = [
      '--serve',
      './tests/server_root',
      '--url',
      'index.html',
      process.platform === 'darwin' ? '--headed' : '',
      '--aiAssert',
      'the content title is "My App"',
    ];
    await execa(cliBin, params);
  });
});

describe('run scripts', () => {
  test('run scripts', async () => {
    const params = ['run', './tests/midscene_scripts'];
    await execa(cliBin, params);
  });
});

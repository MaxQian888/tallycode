import { describe, expect, it } from 'vitest';

import { compileGlob, DEFAULT_TEST_RULES, TestClassifier } from '../testClassifier';

describe('compileGlob', () => {
  it('matches *.ext via single star', () => {
    const re = compileGlob('*.ts');
    expect(re.test('foo.ts')).toBe(true);
    expect(re.test('foo.tsx')).toBe(false);
    expect(re.test('a/foo.ts')).toBe(false);
  });

  it('matches **/ as any number of dirs', () => {
    const re = compileGlob('**/foo.ts');
    expect(re.test('foo.ts')).toBe(true);
    expect(re.test('a/foo.ts')).toBe(true);
    expect(re.test('a/b/foo.ts')).toBe(true);
  });

  it('matches brace alternatives', () => {
    const re = compileGlob('**/*.{test,spec}.{ts,tsx}');
    expect(re.test('a/b.test.ts')).toBe(true);
    expect(re.test('a/b.spec.tsx')).toBe(true);
    expect(re.test('a/b.ts')).toBe(false);
  });

  it('matches dir glob like **/__tests__/**', () => {
    const re = compileGlob('**/__tests__/**');
    expect(re.test('webview/__tests__/foo.test.ts')).toBe(true);
    expect(re.test('webview/foo.test.ts')).toBe(false);
  });
});

describe('testClassifier default rules', () => {
  const c = new TestClassifier();

  it('flags *.test.ts via filename', () => {
    const res = c.classify({ relativePath: 'src/App.test.ts' });
    expect(res).toEqual({ isTest: true, layer: 'filename' });
  });

  it('flags __tests__/ via directory', () => {
    const res = c.classify({ relativePath: 'webview/__tests__/App.tsx' });
    expect(res).toEqual({ isTest: true, layer: 'directory' });
  });

  it('flags *_test.go via filename', () => {
    const res = c.classify({ relativePath: 'pkg/foo_test.go' });
    expect(res).toEqual({ isTest: true, layer: 'filename' });
  });

  it('flags test_*.py via filename', () => {
    const res = c.classify({ relativePath: 'pkg/test_utils.py' });
    expect(res).toEqual({ isTest: true, layer: 'filename' });
  });

  it('flags Java *Test.java via filename', () => {
    const res = c.classify({ relativePath: 'src/main/java/FooTest.java' });
    expect(res).toEqual({ isTest: true, layer: 'filename' });
  });

  it('flags Maven src/test/ directory', () => {
    const res = c.classify({ relativePath: 'project/src/test/java/Foo.java' });
    expect(res).toEqual({ isTest: true, layer: 'directory' });
  });

  it('does not flag plain source', () => {
    const res = c.classify({ relativePath: 'src/index.ts' });
    expect(res).toEqual({ isTest: false, layer: 'none' });
  });

  it('flags via marker when path has no test hint', () => {
    const res = c.classify({
      relativePath: 'scratch/integration.ts',
      headSnippet: 'import { describe, it } from \'vitest\';',
    });
    expect(res.isTest).toBe(true);
    expect(res.layer).toBe('marker');
  });

  it('flags Rust #[test]', () => {
    const res = c.classify({
      relativePath: 'src/utils.rs',
      headSnippet: '#[test]\nfn it_works() {}',
    });
    expect(res.isTest).toBe(true);
    expect(res.layer).toBe('marker');
  });

  it('flags Go func TestFoo', () => {
    const res = c.classify({
      relativePath: 'pkg/util.go',
      headSnippet: 'package pkg\n\nfunc TestThing(t *testing.T) {}',
    });
    expect(res.isTest).toBe(true);
    expect(res.layer).toBe('marker');
  });

  it('flags Java @Test', () => {
    const res = c.classify({
      relativePath: 'src/main/java/Service.java',
      headSnippet: 'import org.junit.Test;\n@Test public void t() {}',
    });
    expect(res.isTest).toBe(true);
    expect(res.layer).toBe('marker');
  });

  it('flags pytest import', () => {
    const res = c.classify({
      relativePath: 'app/helpers.py',
      headSnippet: 'import pytest\n',
    });
    expect(res.isTest).toBe(true);
    expect(res.layer).toBe('marker');
  });

  it('lSP layer takes priority', () => {
    const res = c.classify({
      relativePath: 'src/App.ts',
      lspTestMember: true,
    });
    expect(res).toEqual({ isTest: true, layer: 'lsp' });
  });

  it('lSP layer disabled when useLsp=false', () => {
    const cc = new TestClassifier({ ...DEFAULT_TEST_RULES, useLsp: false });
    const res = cc.classify({ relativePath: 'src/App.ts', lspTestMember: true });
    expect(res.isTest).toBe(false);
  });

  it('per-language rule extends defaults', () => {
    const cc = new TestClassifier(DEFAULT_TEST_RULES, {
      python: { filenameGlobs: ['**/check_*.py'] },
    });
    const res = cc.classify({ relativePath: 'pkg/check_x.py', languageId: 'python' });
    expect(res).toEqual({ isTest: true, layer: 'filename' });
  });

  it('disabling fileMarkers means no marker match', () => {
    const cc = new TestClassifier({ ...DEFAULT_TEST_RULES, fileMarkers: [] });
    const res = cc.classify({
      relativePath: 'src/index.ts',
      headSnippet: 'describe(\'x\', () => {})',
    });
    expect(res.isTest).toBe(false);
  });
});

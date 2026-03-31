import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { setEnvVar, isReposcoutRepo } from "../init.js";

// ---------------------------------------------------------------------------
// setEnvVar
// ---------------------------------------------------------------------------

describe("setEnvVar", () => {
  test("appends key when not present", () => {
    const result = setEnvVar("# comment\n", "GITHUB_TOKEN", "abc123");
    assert.match(result, /^GITHUB_TOKEN=abc123$/m);
  });

  test("replaces an uncommented existing key", () => {
    const result = setEnvVar("GITHUB_TOKEN=old\n", "GITHUB_TOKEN", "new");
    assert.equal(result, "GITHUB_TOKEN=new\n");
    assert.doesNotMatch(result, /old/);
  });

  test("replaces a commented-out key", () => {
    const result = setEnvVar("# GITHUB_TOKEN=\n", "GITHUB_TOKEN", "tok");
    assert.match(result, /^GITHUB_TOKEN=tok$/m);
    assert.doesNotMatch(result, /^#/m);
  });

  test("replaces inline-commented key (no space before #)", () => {
    const result = setEnvVar("#GITHUB_TOKEN=old\n", "GITHUB_TOKEN", "new");
    assert.match(result, /^GITHUB_TOKEN=new$/m);
  });

  test("handles empty input", () => {
    const result = setEnvVar("", "KEY", "val");
    assert.equal(result, "KEY=val\n");
  });

  test("preserves other keys when replacing", () => {
    const input = "FOO=1\nGITHUB_TOKEN=old\nBAR=2\n";
    const result = setEnvVar(input, "GITHUB_TOKEN", "new");
    assert.match(result, /^FOO=1$/m);
    assert.match(result, /^BAR=2$/m);
    assert.match(result, /^GITHUB_TOKEN=new$/m);
    assert.doesNotMatch(result, /old/);
  });
});

// ---------------------------------------------------------------------------
// isReposcoutRepo
// ---------------------------------------------------------------------------

describe("isReposcoutRepo", () => {
  function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "reposcout-init-test-"));
  }

  test("returns false for an empty directory", () => {
    const tmp = makeTmpDir();
    try {
      assert.equal(isReposcoutRepo(tmp), false);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  test("returns true when src/skillEntry.ts exists", () => {
    const tmp = makeTmpDir();
    try {
      fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "src", "skillEntry.ts"), "");
      assert.equal(isReposcoutRepo(tmp), true);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  test("returns true when dist/skillEntry.js + SKILL.md both exist", () => {
    const tmp = makeTmpDir();
    try {
      fs.mkdirSync(path.join(tmp, "dist"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "dist", "skillEntry.js"), "");
      const skillDir = path.join(tmp, ".claude", "skills", "reposcout");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), "");
      assert.equal(isReposcoutRepo(tmp), true);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  test("returns false when only dist/skillEntry.js exists (no SKILL.md)", () => {
    const tmp = makeTmpDir();
    try {
      fs.mkdirSync(path.join(tmp, "dist"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "dist", "skillEntry.js"), "");
      assert.equal(isReposcoutRepo(tmp), false);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});

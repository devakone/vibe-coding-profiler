import { describe, it, expect } from "vitest";
import { classifySubsystem } from "../vibe";

describe("AI Config File Detection", () => {
  describe("Cursor patterns", () => {
    it("detects .cursorrules file", () => {
      expect(classifySubsystem(".cursorrules")).toBe("ai_config");
    });

    it("detects .cursor/rules/ directory files", () => {
      expect(classifySubsystem(".cursor/rules/my-rules.md")).toBe("ai_config");
      expect(classifySubsystem(".cursor/rules/coding-standards.txt")).toBe("ai_config");
    });
  });

  describe("Claude Code patterns", () => {
    it("detects CLAUDE.md file", () => {
      expect(classifySubsystem("CLAUDE.md")).toBe("ai_config");
    });

    it("detects CLAUDE.local.md file", () => {
      expect(classifySubsystem("CLAUDE.local.md")).toBe("ai_config");
    });

    it("detects .claude/CLAUDE.md file", () => {
      expect(classifySubsystem(".claude/CLAUDE.md")).toBe("ai_config");
    });

    it("detects .claude/rules/ directory files", () => {
      expect(classifySubsystem(".claude/rules/project-rules.md")).toBe("ai_config");
    });
  });

  describe("GitHub Copilot patterns", () => {
    it("detects .github/copilot-instructions.md", () => {
      expect(classifySubsystem(".github/copilot-instructions.md")).toBe("ai_config");
    });

    it("detects .github/instructions/*.instructions.md", () => {
      expect(classifySubsystem(".github/instructions/coding.instructions.md")).toBe("ai_config");
    });

    it("detects .github/agents/ directory", () => {
      expect(classifySubsystem(".github/agents/reviewer.yml")).toBe("ai_config");
    });

    it("detects .github/prompts/ directory", () => {
      expect(classifySubsystem(".github/prompts/code-review.md")).toBe("ai_config");
    });
  });

  describe("AGENTS.md convention", () => {
    it("detects AGENTS.md at root", () => {
      expect(classifySubsystem("AGENTS.md")).toBe("ai_config");
    });

    it("detects AGENTS.md in subdirectory", () => {
      expect(classifySubsystem("docs/AGENTS.md")).toBe("ai_config");
    });
  });

  describe("Aider patterns", () => {
    it("detects .aider.conf file", () => {
      expect(classifySubsystem(".aider.conf")).toBe("ai_config");
    });

    it("detects .aider.conf.yml file", () => {
      expect(classifySubsystem(".aider.conf.yml")).toBe("ai_config");
    });
  });

  describe("Cline patterns", () => {
    it("detects .clinerules file", () => {
      expect(classifySubsystem(".clinerules")).toBe("ai_config");
    });

    it("detects .clinerules/ directory files", () => {
      expect(classifySubsystem(".clinerules/rules.md")).toBe("ai_config");
    });
  });

  describe("Non-AI config files", () => {
    it("does not match regular markdown files", () => {
      expect(classifySubsystem("README.md")).toBe("docs");
      expect(classifySubsystem("docs/guide.md")).toBe("docs");
    });

    it("does not match regular config files", () => {
      expect(classifySubsystem(".eslintrc.js")).toBe("infra");
      expect(classifySubsystem("tsconfig.json")).toBe("infra");
    });

    it("does not match source files", () => {
      expect(classifySubsystem("src/components/Button.tsx")).toBe("ui");
      expect(classifySubsystem("src/api/routes.ts")).toBe("api");
    });
  });
});

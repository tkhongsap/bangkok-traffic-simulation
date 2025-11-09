# Claude Code Skills

This directory contains project-specific skills for Claude Code.

## Structure

Each skill is stored in its own directory with the following structure:

```
.claude/skills/skill-name/
├── SKILL.md           (required)
├── reference.md       (optional documentation)
├── examples.md        (optional examples)
├── scripts/           (optional utility scripts)
│   └── helper.py
└── templates/         (optional templates)
    └── template.txt
```

## Creating a New Skill

1. Create a new directory: `mkdir -p .claude/skills/my-skill-name`
2. Copy the template: `cp .claude/skills/example-skill/templates/skill-template.md .claude/skills/my-skill-name/SKILL.md`
3. Edit `SKILL.md` with your skill details
4. Add supporting files as needed

## SKILL.md Format

Every skill must have a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: skill-name
description: What the skill does and when to use it (max 1024 chars)
allowed-tools: Read, Write, Grep  # optional
---
```

## Key Requirements

- **name**: lowercase letters, numbers, and hyphens only (max 64 characters)
- **description**: Critical for Claude to know when to activate the skill
  - Include both WHAT it does and WHEN to use it
  - Use specific trigger keywords
- **allowed-tools**: Optional field to restrict available tools

## Example Skills

See the `example-skill/` directory for a complete example demonstrating:
- Proper SKILL.md structure
- Optional supporting files (reference.md, examples.md)
- Helper scripts and templates
- Best practices and guidelines

## Documentation

For more information, see: https://code.claude.com/docs/en/skills

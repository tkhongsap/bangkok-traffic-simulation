---
name: example-skill
description: Example skill demonstrating proper structure. Use this as a template when creating new skills for the Bangkok Traffic Simulation project.
---

# Example Skill

This is an example skill that demonstrates the proper structure for Claude Code skills.

## Instructions

When creating a new skill:

1. Create a directory in `.claude/skills/` with a descriptive name (lowercase, hyphens only)
2. Add a `SKILL.md` file with YAML frontmatter and Markdown content
3. Include optional supporting files as needed:
   - `reference.md` for detailed documentation
   - `examples.md` for concrete usage examples
   - `scripts/` directory for utility scripts
   - `templates/` directory for template files

## YAML Frontmatter Requirements

- `name`: lowercase letters, numbers, and hyphens only (max 64 characters)
- `description`: what the skill does AND when to use it (max 1024 characters)
- `allowed-tools`: (optional) restrict which tools Claude can use

## Best Practices

- Keep skills focused on a single capability
- Write specific descriptions that include trigger terms
- Provide clear, step-by-step instructions
- Include concrete examples
- Reference supporting files when needed

## Example Usage

To reference supporting files in your skill:
- Link to [reference.md](reference.md) for detailed documentation
- Link to [examples.md](examples.md) for code examples
- Store reusable templates in the `templates/` directory
- Store helper scripts in the `scripts/` directory

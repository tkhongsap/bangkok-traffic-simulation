# Example Skill Examples

This file contains concrete examples of using the skill.

## Example 1: Basic Skill Structure

```yaml
---
name: commit-message-helper
description: Generates clear commit messages from git diffs. Use when writing commit messages or reviewing staged changes.
---

# Commit Message Helper

## Instructions
1. Run `git diff --staged` to see changes
2. Suggest a commit message following project conventions
3. Format: type(scope): summary
```

## Example 2: Skill with Tool Restrictions

```yaml
---
name: code-reviewer
description: Review code for best practices and potential issues. Use when reviewing code, checking PRs, or analyzing code quality.
allowed-tools: Read, Grep, Glob
---

# Code Reviewer

Read-only code review skill that can only use Read, Grep, and Glob tools.
```

## Example 3: Project-Specific Skill

```yaml
---
name: traffic-simulation-helper
description: Helps with Bangkok Traffic Simulation development. Use when adding features, fixing bugs, or analyzing traffic flow algorithms.
---

# Traffic Simulation Helper

## Instructions
1. Analyze traffic flow patterns in simulation
2. Review algorithm efficiency
3. Suggest optimizations based on traffic data
```

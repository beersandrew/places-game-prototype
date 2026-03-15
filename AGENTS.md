# Agent Conventions — places-game-prototype

Read this before implementing any ticket.

## Project Context

This is the places-game prototype. Read `CLAUDE.md` for the full state machine
reference, architecture rules, and file structure.

## Running Tests

```sh
npm test
```

Tests must pass before marking a ticket Done.

## Branch and Commit

- Check the `gitBranchName` field on the Linear ticket. Use that exact branch name.
- Commit message format: `[BEE-NNN] short description`
- One commit per ticket is fine.

## Definition of Done

A ticket is done when:

1. The code satisfies all acceptance criteria in the ticket
2. `npm test` passes with no failures
3. Changes are committed on the ticket's branch
4. The Linear ticket is updated to Done via the Linear MCP tool

## If You Get Stuck

If you encounter a question not answered by this file or `CLAUDE.md`,
append it to `.claude/agent-questions.md` as `[BEE-NNN] <question>`,
make your best judgment call, and continue. Do not stop to ask.

## Updating Linear

Use the Linear MCP tool (`mcp__linear__save_issue`):

- Set `state` to `"In Progress"` when you start work
- Set `state` to `"Done"` when all criteria are met and tests pass

Write descriptions as proper markdown. Never use escaped characters like `\n`.

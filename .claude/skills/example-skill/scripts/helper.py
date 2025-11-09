#!/usr/bin/env python3
"""
Example helper script for Claude Code skills.

This demonstrates how to include utility scripts in your skills directory.
Claude can reference or execute these scripts when the skill is active.
"""

def example_function():
    """Example function to demonstrate skill script structure."""
    print("This is an example helper script")
    print("You can include any utility code here")
    return True

if __name__ == "__main__":
    example_function()

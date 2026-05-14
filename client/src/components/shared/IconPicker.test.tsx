/**
 * IconPicker.test.tsx — Component tests for the shared IconPicker.
 *
 * Tests rendering, search filtering, selection highlighting, and callbacks.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconPicker } from './IconPicker';

describe('IconPicker', () => {
  it('renders the picker container', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    expect(screen.getByTestId('icon-picker')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    const search = screen.getByTestId('icon-picker-search');
    expect(search).toBeInTheDocument();
    expect(search).toHaveAttribute('placeholder', 'Search icons…');
  });

  it('renders multiple icon buttons', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    // Should render many icons from the registry
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(50);
  });

  it('highlights the currently selected icon', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    const bugButton = screen.getByTestId('icon-Bug');
    expect(bugButton.className).toContain('icon-picker__item--selected');
  });

  it('does not highlight non-selected icons', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    const starButton = screen.getByTestId('icon-Star');
    expect(starButton.className).not.toContain('icon-picker__item--selected');
  });

  it('calls onSelect when an icon is clicked', () => {
    const onSelect = vi.fn();
    render(<IconPicker currentIcon="Bug" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('icon-Star'));
    expect(onSelect).toHaveBeenCalledWith('Star');
  });

  it('filters icons based on search input', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    const search = screen.getByTestId('icon-picker-search');
    fireEvent.change(search, { target: { value: 'Bug' } });
    // Should show Bug and possibly GitBranch, etc. that contain "bug"
    const bugBtn = screen.queryByTestId('icon-Bug');
    expect(bugBtn).toBeInTheDocument();
    // Star should be filtered out
    const starBtn = screen.queryByTestId('icon-Star');
    expect(starBtn).not.toBeInTheDocument();
  });

  it('shows empty state for no results', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} />);
    const search = screen.getByTestId('icon-picker-search');
    fireEvent.change(search, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText(/No icons match/)).toBeInTheDocument();
  });

  it('applies accentColor to selected icon style', () => {
    render(<IconPicker currentIcon="Bug" onSelect={vi.fn()} accentColor="#ff0000" />);
    const bugButton = screen.getByTestId('icon-Bug');
    // jsdom serializes colors as rgb()
    expect(bugButton.style.borderColor).toBe('rgb(255, 0, 0)');
  });
});

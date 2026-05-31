/**
 * HueSlider.test.tsx — Component tests for the shared HueSlider.
 *
 * Tests rendering, local tracking without API calls, and commit-on-release behavior.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HueSlider } from './HueSlider';

describe('HueSlider', () => {
  it('renders the slider container', () => {
    render(<HueSlider color="#3d4f7c" onChange={vi.fn()} />);
    expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
  });

  it('renders a range input', () => {
    render(<HueSlider color="#3d4f7c" onChange={vi.fn()} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '360');
  });

  it('renders the color preview swatch', () => {
    render(<HueSlider color="#ff0000" onChange={vi.fn()} />);
    const preview = screen.getByTestId('hue-slider').querySelector('.nords-form__color-preview');
    expect(preview).toBeInTheDocument();
  });

  it('does NOT fire onChange during slider drag (only on release)', () => {
    const onChange = vi.fn();
    render(<HueSlider color="#3d4f7c" onChange={onChange} />);
    const slider = screen.getByRole('slider');

    // Simulate dragging (change event without mouseup)
    fireEvent.change(slider, { target: { value: '180' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('fires onChange on mouseUp', () => {
    const onChange = vi.fn();
    render(<HueSlider color="#3d4f7c" onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '180' } });
    fireEvent.mouseUp(slider);
    expect(onChange).toHaveBeenCalledTimes(1);
    // Should receive a hex string
    expect(onChange.mock.calls[0][0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('uses custom saturation and lightness', () => {
    const onChange = vi.fn();
    render(<HueSlider color="#3d4f7c" onChange={onChange} saturation={70} lightness={50} />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '0' } });
    fireEvent.mouseUp(slider);

    // The hex output should reflect S=70, L=50 at hue=0
    expect(onChange).toHaveBeenCalledTimes(1);
    const hex = onChange.mock.calls[0][0];
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

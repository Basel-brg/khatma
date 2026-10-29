import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CreateKhatmaSheet from '../CreateKhatmaSheet';
import Home from '../../app/page';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Date Picker Full-Rectangle Click and showPicker invocation', () => {
  it('calls showPicker when date input is clicked in CreateKhatmaSheet', () => {
    render(<CreateKhatmaSheet isOpen={true} onClose={vi.fn()} />);

    const dateInput = screen.getByLabelText(/تاريخ القراءة \/ الإتمام المرجو/i) as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.type).toBe('date');

    const showPickerMock = vi.fn();
    dateInput.showPicker = showPickerMock;

    fireEvent.click(dateInput);

    expect(showPickerMock).toHaveBeenCalledTimes(1);
  });

  it('calls showPicker when home page date input is clicked', () => {
    const { container } = render(<Home />);

    const homeDateInput = container.querySelector('#home-date') as HTMLInputElement;
    expect(homeDateInput).toBeTruthy();
    expect(homeDateInput.type).toBe('date');

    const showPickerMock = vi.fn();
    homeDateInput.showPicker = showPickerMock;

    fireEvent.click(homeDateInput);

    expect(showPickerMock).toHaveBeenCalledTimes(1);
  });

  it('handles gracefully when showPicker throws or is not supported', () => {
    render(<CreateKhatmaSheet isOpen={true} onClose={vi.fn()} />);

    const dateInput = screen.getByLabelText(/تاريخ القراءة \/ الإتمام المرجو/i) as HTMLInputElement;
    
    // Simulate error thrown by browser
    dateInput.showPicker = vi.fn().mockImplementation(() => {
      throw new Error('NotSupportedError');
    });

    expect(() => {
      fireEvent.click(dateInput);
    }).not.toThrow();
  });
});


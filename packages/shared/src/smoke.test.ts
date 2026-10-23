import {test, expect} from 'vitest';

function sum(a: number, b: number): number {
    return a + b;
}

test('add two numbers correctly', () => {
    expect(sum(2, 3)).toBe(5)
})
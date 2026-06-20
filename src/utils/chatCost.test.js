import {
    applySpendingDisplayCushion,
    formatDisplayedSpendingUsd,
    SPENDING_DISPLAY_CUSHION
} from './chatCost'

describe('spending display cushion', () => {
    test('SPENDING_DISPLAY_CUSHION is 1%', () => {
        expect(SPENDING_DISPLAY_CUSHION).toBe(1.01)
    })

    test('applySpendingDisplayCushion adds 1% to positive amounts', () => {
        expect(applySpendingDisplayCushion(10)).toBeCloseTo(10.1)
        expect(applySpendingDisplayCushion(0.5)).toBeCloseTo(0.505)
    })

    test('applySpendingDisplayCushion leaves zero and invalid values at zero', () => {
        expect(applySpendingDisplayCushion(0)).toBe(0)
        expect(applySpendingDisplayCushion(-1)).toBe(0)
        expect(applySpendingDisplayCushion(Number.NaN)).toBe(0)
    })

    test('formatDisplayedSpendingUsd formats cushioned totals', () => {
        expect(formatDisplayedSpendingUsd(10)).toBe('10.10')
        expect(formatDisplayedSpendingUsd(0)).toBe('0.00')
    })
})

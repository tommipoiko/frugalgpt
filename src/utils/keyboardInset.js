/**
 * Distance from the bottom of the layout viewport to the bottom of the visual
 * viewport — i.e. how much the OS keyboard (or browser chrome) overlaps the page.
 */
export default function getKeyboardInsetFromBottom() {
    if (typeof window === 'undefined') return 0
    const vv = window.visualViewport
    if (!vv) return 0

    const layoutH = window.innerHeight
    const inset = layoutH - vv.offsetTop - vv.height
    // Keep fractional px — rounding up was lifting the composer slightly above the keyboard.
    return Math.max(0, inset)
}

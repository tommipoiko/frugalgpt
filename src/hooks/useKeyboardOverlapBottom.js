import { useLayoutEffect, useState } from 'react'
import getKeyboardInsetFromBottom from '../utils/keyboardInset'

/**
 * Keyboard overlap in CSS pixels — use as padding-bottom / scroll-padding on
 * overflow:auto regions so focused fields can scroll above the virtual keyboard.
 */
function useKeyboardOverlapBottom() {
    const [inset, setInset] = useState(0)

    useLayoutEffect(() => {
        const vv = window.visualViewport
        if (!vv) return undefined

        let raf = 0
        const sync = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                raf = 0
                setInset(Math.round(getKeyboardInsetFromBottom()))
            })
        }

        vv.addEventListener('resize', sync)
        vv.addEventListener('scroll', sync)
        window.addEventListener('resize', sync)
        sync()

        return () => {
            if (raf) cancelAnimationFrame(raf)
            vv.removeEventListener('resize', sync)
            vv.removeEventListener('scroll', sync)
            window.removeEventListener('resize', sync)
        }
    }, [])

    return inset
}

export default useKeyboardOverlapBottom

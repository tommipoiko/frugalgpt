import { useEffect, useState } from 'react'

/** Matches MUI `sm` breakpoint down (~600px). */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => (
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 600px)').matches
            : false
    ))

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 600px)')
        const handler = () => setIsMobile(mq.matches)
        handler()
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    return isMobile
}

export default useIsMobile

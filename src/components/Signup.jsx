import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function Signup() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const redirect = searchParams.get('redirect')
        navigate(
            `/signin${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`,
            { replace: true }
        )
    }, [navigate, searchParams])

    return null
}

export default Signup

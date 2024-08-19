import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
    apiKey: 'AIzaSyAJTr56dlPNUvGIIaP-ANC8Y9-vsSjDBnc',
    authDomain: 'frugalgpt.firebaseapp.com',
    projectId: 'frugalgpt',
    storageBucket: 'frugalgpt.appspot.com',
    messagingSenderId: '649330159406',
    appId: '1:649330159406:web:2baa982dcd831dbbb894bf'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)
const analytics = getAnalytics(app)

export { db, auth, analytics }

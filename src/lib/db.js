import firebase from 'firebase'

firebase.initializeApp({
  apiKey: 'AIzaSyDHIJbOtxWHs-79n04xifJCvkuUEqbxvjQ',
  authDomain: 'doodles-sync.firebaseapp.com',
  databaseURL: 'https://doodles-sync.firebaseio.com',
  projectId: 'doodles-sync',
  storageBucket: 'doodles-sync.appspot.com',
  messagingSenderId: '601337200849',
  appId: '1:601337200849:web:bbc677a6cd5fa8200445f0'
})
const db = firebase.database()
/** @type firebase.database.Reference */
let settingsRef = null
/** @type firebase.database.Reference */
let drawingRef = null
/** @type firebase.database.Reference */
let stateRef = null

export function auth (callback) {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      if (typeof callback === 'function') callback(user)
    } else {
      if (typeof callback === 'function') callback(null)
    }
  })
  const ps = (location.hash || '').substring(1)
  if (!ps) return
  firebase.auth()
    .signInWithEmailAndPassword(process.env.VUE_APP_DB_USER, ps)
    .catch(function (error) {
      console.error('%c AUTH %c: ', 'background:#ff0000;color:#000', 'color:#00aaff', error.code, error.message)
    })
}

export function subscribeSettings (id, callback) {
  settingsRef = db.ref(`/settings`)
  settingsRef.on('value', (snap) => {
    if (typeof callback === 'function') callback(snap.val())
  })
}

export function subscribeDrawing (id, callback) {
  // if (drawingRef) drawingRef.off()
  drawingRef = db.ref(`/connections/${id}`)
  drawingRef.on('value', (snap) => {
    if (typeof callback === 'function') callback(snap.val())
  })
}

export function subscribeState (id, callback) {
  // if (stateRef) stateRef.off()
  stateRef = db.ref(`/states/${id}`)
  stateRef.on('value', (snap) => {
    if (typeof callback === 'function') callback(snap.val())
  })
}

export function unsubscribe () {
  if (settingsRef) settingsRef.off()
  if (drawingRef) drawingRef.off()
  if (stateRef) stateRef.off()
  settingsRef = null
  drawingRef = null
  stateRef = null
}

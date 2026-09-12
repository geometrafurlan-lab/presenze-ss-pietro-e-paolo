import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './App.css'

function App() {
  const [vista, setVista] = useState('home')

  // =====================================================
  // GIOCATORE
  // =====================================================

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [pin, setPin] = useState('')
  const [confermaPin, setConfermaPin] = useState('')

  const [pinAccesso, setPinAccesso] = useState('')
  const [pinSessioneGiocatore, setPinSessioneGiocatore] =
    useState('')

  const [giocatore, setGiocatore] = useState(null)

  const [allenamentiGiocatore, setAllenamentiGiocatore] =
    useState([])

  const [allenamentoSelezionato, setAllenamentoSelezionato] =
    useState(null)

  // =====================================================
  // DIRIGENZA
  // =====================================================

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const ADMIN_EMAIL = 'admin@sspietroepaolo.it'
  const [dirigente, setDirigente] = useState(null)

  const [giocatoriInAttesa, setGiocatoriInAttesa] =
    useState([])

  const [allenamenti, setAllenamenti] = useState([])

  const [mostraNuovoAllenamento, setMostraNuovoAllenamento] =
    useState(false)

  const [dataAllenamento, setDataAllenamento] = useState('')
  const [oraAllenamento, setOraAllenamento] = useState('')
  const [descrizioneAllenamento, setDescrizioneAllenamento] =
    useState('')

  // =====================================================
  // DETTAGLIO PRESENZE DIRIGENZA
  // =====================================================

  const [allenamentoPresenze, setAllenamentoPresenze] =
    useState(null)

  const [presenzeAllenamento, setPresenzeAllenamento] =
    useState([])

  const [giocatoriApprovati, setGiocatoriApprovati] =
    useState([])

  const [caricamentoPresenze, setCaricamentoPresenze] =
    useState(false)

  // =====================================================
  // GENERALE
  // =====================================================

  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [caricamento, setCaricamento] = useState(false)

  // =====================================================
  // SESSIONE
  // =====================================================

  useEffect(() => {
    controllaSessione()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setDirigente(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const controllaSessione = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) return

    const autorizzato = await controllaDirigente(
      session.user.id
    )

    if (autorizzato) {
      setDirigente(session.user)
      setVista('dirigenza')

      await caricaGiocatoriInAttesa()
      await caricaGiocatoriApprovati()
      await caricaAllenamenti()
    }
  }

  const controllaDirigente = async (userId) => {
    const { data, error } = await supabase
      .from('dirigenti')
      .select('id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(
        'Errore controllo dirigente:',
        error
      )
      return false
    }

    return !!data
  }

  // =====================================================
  // REGISTRAZIONE GIOCATORE
  // =====================================================

  const registrazione = async (e) => {
    e.preventDefault()

    setErrore('')
    setMessaggio('')

    if (!nome.trim() || !cognome.trim()) {
      setErrore(
        'Inserisci nome e cognome.'
      )
      return
    }

    if (!/^[0-9]{6}$/.test(pin)) {
      setErrore(
        'Il PIN deve essere composto da 6 numeri.'
      )
      return
    }

    if (pin !== confermaPin) {
      setErrore(
        'I due PIN non coincidono.'
      )
      return
    }

    setCaricamento(true)

    const { error } = await supabase.rpc(
      'registra_giocatore',
      {
        p_nome: nome.trim(),
        p_cognome: cognome.trim(),
        p_pin: pin,
      }
    )

    setCaricamento(false)

    if (error) {
      console.error(error)
      setErrore(error.message)
      return
    }

    setNome('')
    setCognome('')
    setPin('')
    setConfermaPin('')

    setMessaggio(
      'Registrazione completata! La dirigenza deve ora approvare il tuo account.'
    )
  }

  // =====================================================
  // ACCESSO GIOCATORE
  // =====================================================

  const accesso = async (e) => {
    e.preventDefault()

    setErrore('')
    setMessaggio('')

    if (!/^[0-9]{6}$/.test(pinAccesso)) {
      setErrore(
        'Inserisci un PIN di 6 numeri.'
      )
      return
    }

    setCaricamento(true)

    const pinUtilizzato = pinAccesso

    const { data, error } = await supabase.rpc(
      'accedi_giocatore',
      {
        p_pin: pinUtilizzato,
      }
    )

    setCaricamento(false)

    if (error) {
      console.error(error)
      setErrore(error.message)
      return
    }

    if (!data || data.length === 0) {
      setErrore(
        'PIN non valido oppure account non ancora approvato dalla dirigenza.'
      )
      return
    }

    const giocatoreEntrato = data[0]

    setPinSessioneGiocatore(pinUtilizzato)
    setGiocatore(giocatoreEntrato)
    setPinAccesso('')
    setErrore('')
    setMessaggio('')
    setVista('giocatore')

    await caricaAllenamentiGiocatore(
      pinUtilizzato
    )
  }

  // =====================================================
  // ALLENAMENTI GIOCATORE
  // =====================================================

  const caricaAllenamentiGiocatore = async (
    pinGiocatore
  ) => {
    if (!pinGiocatore) return

    const { data, error } = await supabase.rpc(
      'get_allenamenti_giocatore',
      {
        p_pin: pinGiocatore,
      }
    )

    if (error) {
      console.error(
        'Errore caricamento allenamenti giocatore:',
        error
      )

      setErrore(
        'Impossibile caricare gli allenamenti.'
      )

      return
    }

    setAllenamentiGiocatore(data || [])
  }

  // =====================================================
  // SALVA PRESENZA
  // =====================================================

  const salvaPresenza = async (
    allenamento,
    stato,
    motivo = null
  ) => {
    if (stato !== 'assente') return

    setErrore('')
    setMessaggio('')
    setCaricamento(true)

    const { error } = await supabase.rpc(
      'salva_presenza',
      {
        p_pin: pinSessioneGiocatore,
        p_allenamento_id: allenamento.id,
        p_stato: 'assente',
        p_motivazione: motivo,
      }
    )

    setCaricamento(false)

    if (error) {
      console.error(
        'Errore salvataggio assenza:',
        error
      )

      setErrore(
        "Errore durante il salvataggio dell'assenza."
      )

      return
    }

    setAllenamentiGiocatore(
      (precedenti) =>
        precedenti.map((item) =>
          item.id === allenamento.id
            ? {
                ...item,
                stato: 'assente',
                motivazione: motivo,
              }
            : item
        )
    )

    setAllenamentoSelezionato(null)
    setMessaggio(
      `Assenza registrata: ${motivo}.`
    )
  }

  // =====================================================
  // CANCELLA PRESENZA
  // =====================================================

  const cancellaPresenza = async (
    allenamento
  ) => {
    const conferma = window.confirm(
      'Vuoi cancellare la tua risposta per questo allenamento?'
    )

    if (!conferma) return

    setErrore('')
    setMessaggio('')
    setCaricamento(true)

    const { error } = await supabase.rpc(
      'cancella_presenza',
      {
        p_pin: pinSessioneGiocatore,
        p_allenamento_id: allenamento.id,
      }
    )

    setCaricamento(false)

    if (error) {
      console.error(
        'Errore cancellazione presenza:',
        error
      )

      setErrore(
        'Errore durante la cancellazione.'
      )

      return
    }

    setAllenamentiGiocatore(
      (precedenti) =>
        precedenti.map((item) =>
          item.id === allenamento.id
            ? {
                ...item,
                stato: null,
                motivazione: null,
              }
            : item
        )
    )

    setMessaggio(
      'Assenza annullata. Puoi segnalarla nuovamente quando vuoi.'
    )
  }

  // =====================================================
  // LOGIN DIRIGENZA
  // =====================================================

  const loginDirigenza = async (e) => {
    e.preventDefault()

    setErrore('')
    setMessaggio('')

    if (username.trim().toLowerCase() !== 'admin') {
      setErrore('Nome utente non valido.')
      return
    }

    setCaricamento(true)

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      })

    if (error) {
      setCaricamento(false)
      console.error(error)
      setErrore(error.message)
      return
    }

    const autorizzato =
      await controllaDirigente(
        data.user.id
      )

    if (!autorizzato) {
      await supabase.auth.signOut()

      setCaricamento(false)

      setErrore(
        'Questo account non è autorizzato all’Area Dirigenza.'
      )

      return
    }

    setDirigente(data.user)
    setUsername('')
    setPassword('')
    setErrore('')
    setCaricamento(false)
    setVista('dirigenza')

    await caricaGiocatoriInAttesa()
    await caricaGiocatoriApprovati()
    await caricaAllenamenti()
  }

  // =====================================================
  // GIOCATORI IN ATTESA
  // =====================================================

  const caricaGiocatoriInAttesa = async () => {
    const { data, error } = await supabase
      .from('giocatori')
      .select(
        'id, nome, cognome, created_at'
      )
      .eq('approvato', false)
      .eq('attivo', true)
      .order('cognome', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Errore caricamento giocatori:',
        error
      )

      setErrore(
        'Impossibile caricare i giocatori in attesa.'
      )

      return
    }

    setGiocatoriInAttesa(data || [])
  }

  // =====================================================
  // GIOCATORI APPROVATI
  // =====================================================

  const caricaGiocatoriApprovati = async () => {
    const { data, error } = await supabase
      .from('giocatori')
      .select(
        'id, nome, cognome'
      )
      .eq('approvato', true)
      .eq('attivo', true)
      .order('cognome', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Errore caricamento giocatori approvati:',
        error
      )

      setErrore(
        'Impossibile caricare i giocatori approvati.'
      )

      return
    }

    setGiocatoriApprovati(data || [])
  }

  // =====================================================
  // APPROVA GIOCATORE
  // =====================================================

  const approvaGiocatore = async (id) => {
    setErrore('')
    setMessaggio('')

    const { error } = await supabase
      .from('giocatori')
      .update({
        approvato: true,
      })
      .eq('id', id)

    if (error) {
      console.error(
        'Errore approvazione:',
        error
      )

      setErrore(
        'Errore durante l’approvazione del giocatore.'
      )

      return
    }

    setMessaggio(
      'Giocatore approvato correttamente.'
    )

    await caricaGiocatoriInAttesa()
    await caricaGiocatoriApprovati()
  }

  // =====================================================
  // ALLENAMENTI
  // =====================================================

  const caricaAllenamenti = async () => {
    const { data, error } = await supabase
      .from('allenamenti')
      .select(
        'id, data, ora, descrizione, aperto'
      )
      .order('data', {
        ascending: true,
      })
      .order('ora', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Errore caricamento allenamenti:',
        error
      )

      setErrore(
        'Impossibile caricare gli allenamenti.'
      )

      return
    }

    setAllenamenti(data || [])
  }

  // =====================================================
  // CREA ALLENAMENTO
  // =====================================================

  const creaAllenamento = async (e) => {
    e.preventDefault()

    setErrore('')
    setMessaggio('')

    if (!dataAllenamento) {
      setErrore(
        'Inserisci la data dell’allenamento.'
      )
      return
    }

    if (!oraAllenamento) {
      setErrore(
        'Inserisci l’ora dell’allenamento.'
      )
      return
    }

    setCaricamento(true)

    const { error } = await supabase
      .from('allenamenti')
      .insert({
        data: dataAllenamento,
        ora: oraAllenamento,
        descrizione:
          descrizioneAllenamento.trim() ||
          null,
        aperto: true,
      })

    setCaricamento(false)

    if (error) {
      console.error(
        'Errore creazione allenamento:',
        error
      )

      setErrore(
        'Errore durante la creazione dell’allenamento.'
      )

      return
    }

    setDataAllenamento('')
    setOraAllenamento('')
    setDescrizioneAllenamento('')
    setMostraNuovoAllenamento(false)

    setMessaggio(
      'Allenamento creato correttamente.'
    )

    await caricaAllenamenti()
  }

  // =====================================================
  // CARICA DETTAGLIO PRESENZE
  // =====================================================

  const apriPresenzeAllenamento = async (
    allenamento
  ) => {
    setErrore('')
    setMessaggio('')
    setCaricamentoPresenze(true)

    setAllenamentoPresenze(allenamento)
    setPresenzeAllenamento([])

    const { data, error } = await supabase
      .from('presenze')
      .select(
        `
        id,
        giocatore_id,
        allenamento_id,
        stato,
        motivazione,
        created_at,
        giocatori (
          id,
          nome,
          cognome
        )
        `
      )
      .eq(
        'allenamento_id',
        allenamento.id
      )

    setCaricamentoPresenze(false)

    if (error) {
      console.error(
        'Errore caricamento presenze:',
        error
      )

      setErrore(
        'Impossibile caricare le presenze.'
      )

      return
    }

    setPresenzeAllenamento(data || [])
  }

  // =====================================================
  // CHIUDI DETTAGLIO PRESENZE
  // =====================================================

  const chiudiPresenzeAllenamento = () => {
    setAllenamentoPresenze(null)
    setPresenzeAllenamento([])
    setErrore('')
    setMessaggio('')
  }

  // =====================================================
  // LOGOUT GIOCATORE
  // =====================================================

  const logoutGiocatore = () => {
    setGiocatore(null)
    setPinSessioneGiocatore('')
    setAllenamentiGiocatore([])
    setAllenamentoSelezionato(null)

    setErrore('')
    setMessaggio('')

    setVista('home')
  }

  // =====================================================
  // LOGOUT DIRIGENZA
  // =====================================================

  const logoutDirigenza = async () => {
    await supabase.auth.signOut()

    setDirigente(null)
    setGiocatoriInAttesa([])
    setGiocatoriApprovati([])
    setAllenamenti([])
    setAllenamentoPresenze(null)
    setPresenzeAllenamento([])

    setErrore('')
    setMessaggio('')

    setVista('home')
  }

  // =====================================================
  // TORNA HOME
  // =====================================================

  const tornaHome = () => {
    setErrore('')
    setMessaggio('')
    setVista('home')
  }

  // =====================================================
  // HOME
  // =====================================================

  if (vista === 'home') {
    return (
      <div className="app">
        <main className="home-container">

          <div className="home-card">

            <div className="logo-circle">
              ⚽
            </div>

            <h1>
              SS. PIETRO E PAOLO A.C.
            </h1>

            <div className="season">
              <span>
                PRESENZE ALLENAMENTO
              </span>

              <strong>
                2026 / 27
              </strong>
            </div>

            <div className="home-buttons">

              <button
                className="main-button"
                onClick={() => {
                  setErrore('')
                  setMessaggio('')
                  setVista(
                    'giocatore-login'
                  )
                }}
              >
                Area Giocatore
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  setErrore('')
                  setMessaggio('')
                  setVista(
                    'dirigenza-login'
                  )
                }}
              >
                Area Dirigenza
              </button>

            </div>

            <div className="home-footer">
              Stagione sportiva 2026 / 2027
            </div>

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // LOGIN GIOCATORE
  // =====================================================

  if (vista === 'giocatore-login') {
    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card">

            <button
              className="back-button"
              onClick={tornaHome}
            >
              ← Torna indietro
            </button>

            <div className="player-header">

              <div className="player-icon">
                ⚽
              </div>

              <h1>
                Area Giocatore
              </h1>

              <p>
                SS. Pietro e Paolo A.C. ·
                2026 / 27
              </p>

            </div>

            <form onSubmit={accesso}>

              <label>
                PIN personale
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                placeholder="Inserisci il tuo PIN"
                value={pinAccesso}
                onChange={(e) => {
                  const nuovoPin =
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)

                  setPinAccesso(
                    nuovoPin
                  )
                }}
              />

              {errore && (
                <div className="error-message">
                  {errore}
                </div>
              )}

              <button
                type="submit"
                className="main-button full-width"
                disabled={caricamento}
              >
                {caricamento
                  ? 'Accesso...'
                  : 'Accedi'}
              </button>

            </form>

            <div className="divider">
              <span>
                oppure
              </span>
            </div>

            <button
              className="secondary-button full-width"
              onClick={() => {
                setErrore('')
                setMessaggio('')
                setVista(
                  'giocatore-registrazione'
                )
              }}
            >
              Registrati
            </button>

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // REGISTRAZIONE
  // =====================================================

  if (
    vista ===
    'giocatore-registrazione'
  ) {
    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card">

            <button
              className="back-button"
              onClick={() => {
                setErrore('')
                setMessaggio('')
                setVista(
                  'giocatore-login'
                )
              }}
            >
              ← Torna indietro
            </button>

            <div className="player-header">

              <div className="player-icon">
                ⚽
              </div>

              <h1>
                Registrazione
              </h1>

              <p>
                SS. Pietro e Paolo A.C. ·
                2026 / 27
              </p>

            </div>

            <form onSubmit={registrazione}>

              <label>
                Nome
              </label>

              <input
                type="text"
                placeholder="Inserisci il nome"
                value={nome}
                onChange={(e) =>
                  setNome(
                    e.target.value
                  )
                }
              />

              <label>
                Cognome
              </label>

              <input
                type="text"
                placeholder="Inserisci il cognome"
                value={cognome}
                onChange={(e) =>
                  setCognome(
                    e.target.value
                  )
                }
              />

              <label>
                Scegli un PIN personale
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                placeholder="6 numeri"
                value={pin}
                onChange={(e) =>
                  setPin(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
              />

              <label>
                Conferma PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                placeholder="Ripeti il PIN"
                value={confermaPin}
                onChange={(e) =>
                  setConfermaPin(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
              />

              <div className="pin-info">
                Il PIN deve essere composto
                da 6 numeri.
                <br />
                Ricordalo: ti servirà per
                accedere in futuro.
              </div>

              {errore && (
                <div className="error-message">
                  {errore}
                </div>
              )}

              {messaggio && (
                <div className="success-message">
                  {messaggio}
                </div>
              )}

              <button
                type="submit"
                className="main-button full-width"
                disabled={caricamento}
              >
                {caricamento
                  ? 'Registrazione...'
                  : 'Completa registrazione'}
              </button>

            </form>

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // LOGIN DIRIGENZA
  // =====================================================

  if (vista === 'dirigenza-login') {
    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card">

            <button
              className="back-button"
              onClick={tornaHome}
            >
              ← Torna indietro
            </button>

            <div className="player-header">

              <div className="player-icon">
                🔐
              </div>

              <h1>
                Area Dirigenza
              </h1>

              <p>
                SS. Pietro e Paolo A.C. ·
                2026 / 27
              </p>

            </div>

            <form
              onSubmit={loginDirigenza}
            >

              <label>
                Nome utente
              </label>

              <input
                type="text"
                placeholder="Inserisci il nome utente"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
              />

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="Inserisci la password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
              />

              {errore && (
                <div className="error-message">
                  {errore}
                </div>
              )}

              <button
                type="submit"
                className="main-button full-width"
                disabled={caricamento}
              >
                {caricamento
                  ? 'Accesso...'
                  : 'Accedi alla dirigenza'}
              </button>

            </form>

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // AREA GIOCATORE
  // =====================================================

  if (vista === 'giocatore') {
    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card management-card">

            <button
              className="back-button"
              onClick={logoutGiocatore}
            >
              ← Esci
            </button>

            <div className="player-header">

              <div className="player-icon">
                ⚽
              </div>

              <h1>
                Ciao {giocatore?.nome}!
              </h1>

              <p>
                {giocatore?.nome}{' '}
                {giocatore?.cognome}
              </p>

            </div>

            {errore && (
              <div className="error-message">
                {errore}
              </div>
            )}

            {messaggio && (
              <div className="success-message">
                {messaggio}
              </div>
            )}

            <div className="management-section">

              <div className="section-title">

                <h2>
                  Prossimi allenamenti
                </h2>

                <span className="players-count">
                  {allenamentiGiocatore.length}
                </span>

              </div>

              {allenamentiGiocatore.length ===
              0 ? (

                <div className="empty-box">

                  <div className="empty-icon">
                    📅
                  </div>

                  <strong>
                    Nessun allenamento disponibile
                  </strong>

                  <p>
                    Al momento non ci sono
                    allenamenti aperti.
                  </p>

                </div>

              ) : (

                <div className="training-list">

                  {allenamentiGiocatore.map(
                    (allenamento) => (

                      <div
                        className="training-card player-training-card"
                        key={allenamento.id}
                      >

                        <div className="training-date">

                          <span>
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).toLocaleDateString(
                              'it-IT',
                              {
                                weekday:
                                  'short',
                              }
                            )}
                          </span>

                          <strong>
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).getDate()}
                          </strong>

                        </div>

                        <div className="training-info">

                          <div className="training-main">
                            {allenamento.descrizione ||
                              'Allenamento'}
                          </div>

                          <div className="training-details">
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).toLocaleDateString(
                              'it-IT',
                              {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              }
                            )}
                          </div>

                          <div className="training-time">
                            🕐{' '}
                            {allenamento.ora?.slice(
                              0,
                              5
                            )}
                          </div>

                        </div>

                        {!allenamento.stato && (

                          <div className="attendance-buttons">

                            <button
                              className="absent-button"
                              onClick={() =>
                                setAllenamentoSelezionato(
                                  allenamento
                                )
                              }
                              disabled={
                                caricamento
                              }
                            >
                              ✕ SEGNALA ASSENZA
                            </button>

                          </div>

                        )}

                        {allenamento.stato === 'assente' && (

                          <div className="attendance-management">

                            <div className="attendance-result absent">
                              ✕ ASSENZA · {allenamento.motivazione || 'Motivo non indicato'}
                            </div>

                            <div className="attendance-actions">

                              <button
                                className="modify-button"
                                onClick={() =>
                                  setAllenamentoSelezionato(
                                    allenamento
                                  )
                                }
                                disabled={
                                  caricamento
                                }
                              >
                                MODIFICA ASSENZA
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  cancellaPresenza(
                                    allenamento
                                  )
                                }
                                disabled={
                                  caricamento
                                }
                              >
                                ANNULLA ASSENZA
                              </button>

                            </div>

                          </div>

                        )}

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

            {allenamentoSelezionato && (

              <div className="absence-box">

                <div className="new-training-title">

                  <h3>
                    {allenamentoSelezionato.stato === 'assente'
                      ? 'Modifica assenza'
                      : 'Segnala assenza'}
                  </h3>

                  <button
                    className="close-training"
                    onClick={() =>
                      setAllenamentoSelezionato(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                <p>
                  Seleziona il motivo dell'assenza:
                </p>

                <div className="absence-options">

                  <button
                    className="absence-option"
                    onClick={() =>
                      salvaPresenza(
                        allenamentoSelezionato,
                        'assente',
                        'Salute'
                      )
                    }
                    disabled={
                      caricamento
                    }
                  >
                    <span className="absence-option-icon">
                      🩺
                    </span>

                    <span>
                      SALUTE
                    </span>
                  </button>

                  <button
                    className="absence-option"
                    onClick={() =>
                      salvaPresenza(
                        allenamentoSelezionato,
                        'assente',
                        'Lavoro'
                      )
                    }
                    disabled={
                      caricamento
                    }
                  >
                    <span className="absence-option-icon">
                      💼
                    </span>

                    <span>
                      LAVORO
                    </span>
                  </button>

                  <button
                    className="absence-option"
                    onClick={() =>
                      salvaPresenza(
                        allenamentoSelezionato,
                        'assente',
                        'Famiglia'
                      )
                    }
                    disabled={
                      caricamento
                    }
                  >
                    <span className="absence-option-icon">
                      👨‍👩‍👧
                    </span>

                    <span>
                      FAMIGLIA
                    </span>
                  </button>

                  <button
                    className="absence-option"
                    onClick={() =>
                      salvaPresenza(
                        allenamentoSelezionato,
                        'assente',
                        'Infortunio'
                      )
                    }
                    disabled={
                      caricamento
                    }
                  >
                    <span className="absence-option-icon">
                      🩹
                    </span>

                    <span>
                      INFORTUNIO
                    </span>
                  </button>

                  <button
                    className="absence-option"
                    onClick={() =>
                      salvaPresenza(
                        allenamentoSelezionato,
                        'assente',
                        'Vacanza'
                      )
                    }
                    disabled={
                      caricamento
                    }
                  >
                    <span className="absence-option-icon">
                      🏖️
                    </span>

                    <span>
                      VACANZA
                    </span>
                  </button>

                </div>

              </div>

            )}

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // AREA DIRIGENZA - DETTAGLIO ASSENZE
  // =====================================================

  if (
    vista === 'dirigenza' &&
    allenamentoPresenze
  ) {
    const assenti =
      presenzeAllenamento.filter(
        (item) => item.stato === 'assente'
      )

    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card management-card">

            <button
              className="back-button"
              onClick={
                chiudiPresenzeAllenamento
              }
            >
              ← Torna agli allenamenti
            </button>

            <div className="player-header">

              <div className="player-icon">
                📋
              </div>

              <h1>
                Assenze
              </h1>

              <p>
                {allenamentoPresenze.descrizione ||
                  'Allenamento'}
              </p>

              <div className="training-detail-header">
                {new Date(
                  allenamentoPresenze.data +
                    'T00:00:00'
                ).toLocaleDateString(
                  'it-IT',
                  {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }
                )}

                {' · '}

                {allenamentoPresenze.ora?.slice(
                  0,
                  5
                )}
              </div>

            </div>

            {errore && (
              <div className="error-message">
                {errore}
              </div>
            )}

            {caricamentoPresenze ? (

              <div className="empty-box">
                <div className="empty-icon">
                  ⏳
                </div>

                <strong>
                  Caricamento assenze...
                </strong>
              </div>

            ) : (

              <>
                <div
                  className="attendance-summary"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '8px 0 22px',
                  }}
                >
                  <div
                    className="summary-card summary-absent"
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 22px',
                      borderRadius: '18px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          marginBottom: '4px',
                        }}
                      >
                        ASSENZE SEGNALATE
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          opacity: 0.72,
                        }}
                      >
                        Giocatori che hanno comunicato l'assenza
                      </span>
                    </div>

                    <strong
                      style={{
                        fontSize: '30px',
                        lineHeight: 1,
                        minWidth: '42px',
                        textAlign: 'right',
                      }}
                    >
                      {assenti.length}
                    </strong>
                  </div>
                </div>

                <div
                  className="attendance-section"
                  style={{
                    marginTop: '4px',
                  }}
                >
                  <div
                    className="attendance-section-title absent-title"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '14px',
                    }}
                  >
                    <span
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </span>

                    <span style={{ flex: 1, fontWeight: 800 }}>
                      ASSENTI
                    </span>

                    <strong
                      style={{
                        fontSize: '15px',
                        padding: '4px 9px',
                        borderRadius: '999px',
                      }}
                    >
                      {assenti.length}
                    </strong>
                  </div>

                  {assenti.length === 0 ? (
                    <div
                      className="attendance-empty"
                      style={{
                        textAlign: 'center',
                        padding: '26px 18px',
                        borderRadius: '16px',
                      }}
                    >
                      Nessuna assenza segnalata.
                    </div>
                  ) : (
                    <div
                      className="attendance-list"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {assenti.map((item) => {
                        const nome = item.giocatori?.nome || ''
                        const cognome = item.giocatori?.cognome || ''
                        const iniziali = `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase()
                        const motivo = item.motivazione || 'Motivo non indicato'

                        const iconeMotivo = {
                          Salute: '🩺',
                          Lavoro: '💼',
                          Famiglia: '🏠',
                          Infortunio: '🩹',
                          Vacanza: '🏖️',
                        }

                        return (
                          <div
                            className="attendance-player"
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '15px 16px',
                              borderRadius: '18px',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              className="attendance-player-avatar"
                              style={{
                                width: '50px',
                                height: '50px',
                                minWidth: '50px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px',
                                fontWeight: 800,
                              }}
                            >
                              {iniziali}
                            </div>

                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                className="attendance-player-name"
                                style={{
                                  fontSize: '17px',
                                  fontWeight: 800,
                                  lineHeight: 1.2,
                                  textTransform: 'uppercase',
                                  marginBottom: '7px',
                                }}
                              >
                                {cognome} {nome}
                              </div>

                              <div
                                className="absence-reason"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  padding: '5px 9px',
                                  borderRadius: '999px',
                                }}
                              >
                                <span>{iconeMotivo[motivo] || 'ℹ️'}</span>
                                <span>{motivo}</span>
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: '22px',
                                opacity: 0.55,
                                flexShrink: 0,
                              }}
                              aria-hidden="true"
                            >
                              ›
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

        </main>
      </div>
    )
  }

  // =====================================================
  // AREA DIRIGENZA
  // =====================================================

  if (vista === 'dirigenza') {
    return (
      <div className="app">
        <main className="player-container">

          <div className="player-card management-card">

            <button
              className="back-button"
              onClick={logoutDirigenza}
            >
              ← Esci dalla dirigenza
            </button>

            <div className="player-header">

              <div className="player-icon">
                🔐
              </div>

              <h1>
                Area Dirigenza
              </h1>

              <p>
                SS. Pietro e Paolo A.C. ·
                2026 / 27
              </p>

            </div>

            {errore && (
              <div className="error-message">
                {errore}
              </div>
            )}

            {messaggio && (
              <div className="success-message">
                {messaggio}
              </div>
            )}

            {/* =================================================
                GIOCATORI IN ATTESA
               ================================================= */}

            <div className="management-section">

              <div className="section-title">

                <h2>
                  Giocatori in attesa
                </h2>

                <span className="players-count">
                  {giocatoriInAttesa.length}
                </span>

              </div>

              {giocatoriInAttesa.length ===
              0 ? (

                <div className="empty-box">

                  <div className="empty-icon">
                    ✓
                  </div>

                  <strong>
                    Nessuna registrazione in attesa
                  </strong>

                  <p>
                    Tutti i giocatori registrati
                    sono stati approvati.
                  </p>

                </div>

              ) : (

                <div className="pending-list">

                  {giocatoriInAttesa.map(
                    (player) => (

                      <div
                        className="pending-player"
                        key={player.id}
                      >

                        <div className="player-info">

                          <div className="player-avatar">
                            {player.nome?.charAt(
                              0
                            )}
                            {player.cognome?.charAt(
                              0
                            )}
                          </div>

                          <div>

                            <div className="player-name">
                              {player.cognome}{' '}
                              {player.nome}
                            </div>

                            <div className="player-status">
                              Registrazione in attesa
                            </div>

                          </div>

                        </div>

                        <button
                          className="approve-button"
                          onClick={() =>
                            approvaGiocatore(
                              player.id
                            )
                          }
                        >
                          Approva
                        </button>

                      </div>

                    )
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                ALLENAMENTI
               ================================================= */}

            <div className="management-section">

              <div className="section-title">

                <h2>
                  Allenamenti
                </h2>

                <span className="players-count">
                  {allenamenti.length}
                </span>

              </div>

              {!mostraNuovoAllenamento && (

                <button
                  className="main-button full-width"
                  onClick={() => {
                    setErrore('')
                    setMessaggio('')
                    setMostraNuovoAllenamento(
                      true
                    )
                  }}
                >
                  + Nuovo allenamento
                </button>

              )}

              {mostraNuovoAllenamento && (

                <div className="new-training-box">

                  <div className="new-training-title">

                    <h3>
                      Nuovo allenamento
                    </h3>

                    <button
                      className="close-training"
                      onClick={() =>
                        setMostraNuovoAllenamento(
                          false
                        )
                      }
                    >
                      ×
                    </button>

                  </div>

                  <form
                    onSubmit={
                      creaAllenamento
                    }
                  >

                    <label>
                      Data
                    </label>

                    <input
                      type="date"
                      value={
                        dataAllenamento
                      }
                      onChange={(e) =>
                        setDataAllenamento(
                          e.target.value
                        )
                      }
                    />

                    <label>
                      Ora
                    </label>

                    <input
                      type="time"
                      value={
                        oraAllenamento
                      }
                      onChange={(e) =>
                        setOraAllenamento(
                          e.target.value
                        )
                      }
                    />

                    <label>
                      Descrizione
                    </label>

                    <input
                      type="text"
                      placeholder="Es. Allenamento"
                      value={
                        descrizioneAllenamento
                      }
                      onChange={(e) =>
                        setDescrizioneAllenamento(
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="submit"
                      className="main-button full-width"
                      disabled={
                        caricamento
                      }
                    >
                      {caricamento
                        ? 'Creazione...'
                        : 'Crea allenamento'}
                    </button>

                  </form>

                </div>
              )}

              {allenamenti.length ===
              0 ? (

                <div className="empty-box training-empty">

                  <div className="empty-icon">
                    📅
                  </div>

                  <strong>
                    Nessun allenamento programmato
                  </strong>

                  <p>
                    Crea il primo allenamento
                    utilizzando il pulsante qui sopra.
                  </p>

                </div>

              ) : (

                <div className="training-list">

                  {allenamenti.map(
                    (allenamento) => (

                      <div
                        className="training-card management-training-card"
                        key={allenamento.id}
                        onClick={() =>
                          apriPresenzeAllenamento(
                            allenamento
                          )
                        }
                      >

                        <div className="training-date">

                          <span>
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).toLocaleDateString(
                              'it-IT',
                              {
                                weekday:
                                  'short',
                              }
                            )}
                          </span>

                          <strong>
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).getDate()}
                          </strong>

                        </div>

                        <div className="training-info">

                          <div className="training-main">
                            {allenamento.descrizione ||
                              'Allenamento'}
                          </div>

                          <div className="training-details">
                            {new Date(
                              allenamento.data +
                                'T00:00:00'
                            ).toLocaleDateString(
                              'it-IT',
                              {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              }
                            )}
                          </div>

                          <div className="training-time">
                            🕐{' '}
                            {allenamento.ora?.slice(
                              0,
                              5
                            )}
                          </div>

                        </div>

                        <div
                          className={
                            allenamento.aperto
                              ? 'training-status open'
                              : 'training-status closed'
                          }
                        >
                          {allenamento.aperto
                            ? 'Aperto'
                            : 'Chiuso'}
                        </div>

                        <div
                          className="view-attendance"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            apriPresenzeAllenamento(
                              allenamento
                            )
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              apriPresenzeAllenamento(
                                allenamento
                              )
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            width: '100%',
                            marginTop: '18px',
                            padding: '16px 18px',
                            border: '2px solid #b9d8ff',
                            borderRadius: '16px',
                            background: '#eef6ff',
                            color: '#145dcc',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            fontWeight: '800',
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div
                              style={{
                                fontSize: '20px',
                                fontWeight: '800',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Vedi assenze
                            </div>
                          </div>

                          <div
                            style={{
                              flex: '0 0 auto',
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#1769e0',
                              color: '#fff',
                              fontSize: '26px',
                              lineHeight: 1,
                            }}
                          >
                            →
                          </div>
                        </div>

                      </div>

                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </main>
      </div>
    )
  }

  return null
}

export default App
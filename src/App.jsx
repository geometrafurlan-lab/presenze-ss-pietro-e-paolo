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

  const [motivoAssenzaSelezionato, setMotivoAssenzaSelezionato] =
    useState('')
  const [recuperoAllenamento, setRecuperoAllenamento] =
    useState(false)
  const [dataRecupero, setDataRecupero] = useState('')
  const [oraRecupero, setOraRecupero] = useState('')

  // =====================================================
  // VISITA MEDICA GIOCATORE
  // =====================================================

  const [visitaMedica, setVisitaMedica] = useState(null)
  const [dataVisitaMedica, setDataVisitaMedica] = useState('')
  const [mostraDataVisitaMedica, setMostraDataVisitaMedica] = useState(false)

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
  const [mostraArchivioAllenamenti, setMostraArchivioAllenamenti] =
    useState(false)

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

  const [visiteMediche, setVisiteMediche] = useState([])

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
      await caricaVisiteMediche()
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
    await caricaVisitaMedicaGiocatore(pinUtilizzato)
  }

  // =====================================================
  // VISITA MEDICA GIOCATORE
  // =====================================================

  const caricaVisitaMedicaGiocatore = async (pinGiocatore) => {
    if (!pinGiocatore) return

    const { data, error } = await supabase.rpc(
      'get_visita_medica_giocatore',
      { p_pin: pinGiocatore }
    )

    if (error) {
      console.error('Errore caricamento visita medica:', error)
      setErrore('Impossibile caricare lo stato della visita medica.')
      return
    }

    setVisitaMedica(data?.[0] || null)
    setDataVisitaMedica(data?.[0]?.data_programmata || '')
    setMostraDataVisitaMedica(false)
  }

  const salvaVisitaMedica = async (stato, dataProgrammata = null) => {
    setErrore('')
    setMessaggio('')

    if (stato === 'programmata' && !dataProgrammata) {
      setErrore('Seleziona la data della visita medica.')
      return
    }

    setCaricamento(true)

    const { error } = await supabase.rpc(
      'salva_visita_medica',
      {
        p_pin: pinSessioneGiocatore,
        p_stato: stato,
        p_data_programmata: dataProgrammata || null,
      }
    )

    setCaricamento(false)

    if (error) {
      console.error('Errore salvataggio visita medica:', error)
      setErrore('Errore durante il salvataggio della visita medica.')
      return
    }

    await caricaVisitaMedicaGiocatore(pinSessioneGiocatore)
    setMostraDataVisitaMedica(false)
    setMessaggio(
      stato === 'effettuata'
        ? 'Visita medica registrata come effettuata.'
        : stato === 'programmata'
          ? 'Data della visita medica registrata correttamente.'
          : 'Stato della visita medica aggiornato.'
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
  // LIMITE SEGNALAZIONE ASSENZA
  // =====================================================

  const assenzaConsentita = (allenamento) => {
    if (!allenamento?.data || !allenamento?.ora) return true

    const inizioAllenamento = new Date(
      `${allenamento.data}T${allenamento.ora.slice(0, 5)}:00`
    )

    const limiteAssenza =
      inizioAllenamento.getTime() - 60 * 60 * 1000

    return Date.now() <= limiteAssenza
  }

  // =====================================================
  // SALVA PRESENZA
  // =====================================================

  const salvaPresenza = async (
    allenamento,
    stato,
    motivo = null,
    recupero = false,
    dataRecuperoVal = null,
    oraRecuperoVal = null
  ) => {
    if (stato !== 'assente') return

    if (!assenzaConsentita(allenamento)) {
      setErrore(
        'Le assenze possono essere comunicate fino a 1 ora prima dell’allenamento. Oltre questo termine saranno accettate solo emergenze dell’ultimo minuto, da comunicare direttamente alla società.'
      )
      setAllenamentoSelezionato(null)
      return
    }

    if (recupero && (!dataRecuperoVal || !oraRecuperoVal)) {
      setErrore('Seleziona giorno e orario del recupero.')
      return
    }

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
        p_recupero: recupero,
        p_data_recupero: recupero ? dataRecuperoVal : null,
        p_ora_recupero: recupero ? oraRecuperoVal : null,
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
                recupero,
                data_recupero: recupero ? dataRecuperoVal : null,
                ora_recupero: recupero ? oraRecuperoVal : null,
              }
            : item
        )
    )

    setAllenamentoSelezionato(null)
    setMotivoAssenzaSelezionato('')
    setRecuperoAllenamento(false)
    setDataRecupero('')
    setOraRecupero('')
    setMessaggio(
      recupero
        ? `Assenza registrata: ${motivo}. Recupero programmato per ${new Date(`${dataRecuperoVal}T00:00:00`).toLocaleDateString('it-IT')} alle ${oraRecuperoVal.slice(0, 5)}.`
        : `Assenza registrata: ${motivo}.`
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
                recupero: false,
                data_recupero: null,
                ora_recupero: null,
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
    await caricaVisiteMediche()
    await caricaAllenamenti()
  }

  // =====================================================
  // VISITE MEDICHE DIRIGENZA
  // =====================================================

  const caricaVisiteMediche = async () => {
    const { data, error } = await supabase
      .from('visite_mediche')
      .select('id, giocatore_id, stato, data_programmata, giocatori(nome, cognome)')
      .in('stato', ['effettuata', 'programmata'])
      .order('data_programmata', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Errore caricamento visite mediche:', error)
      setErrore('Impossibile caricare le visite mediche.')
      return
    }

    setVisiteMediche(data || [])
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
  // ARCHIVIA ALLENAMENTO
  // =====================================================

  const archiviaAllenamento = async (allenamento) => {
    const conferma = window.confirm(
      'Vuoi archiviare questo allenamento? Non sarà più visibile ai giocatori.'
    )

    if (!conferma) return

    setErrore('')
    setMessaggio('')
    setCaricamento(true)

    const { error } = await supabase
      .from('allenamenti')
      .update({
        aperto: false,
      })
      .eq('id', allenamento.id)

    setCaricamento(false)

    if (error) {
      console.error(
        'Errore archiviazione allenamento:',
        error
      )

      setErrore(
        'Errore durante l’archiviazione dell’allenamento.'
      )

      return
    }

    setMessaggio(
      'Allenamento archiviato correttamente.'
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
        recupero,
        data_recupero,
        ora_recupero,
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
    setVisitaMedica(null)
    setDataVisitaMedica('')
    setMostraDataVisitaMedica(false)

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
    setVisiteMediche([])

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
            <button className="back-button" onClick={logoutGiocatore}>← Esci</button>
            <div className="player-header">
              <div className="player-icon">⚽</div>
              <h1>Ciao {giocatore?.nome}!</h1>
              <p>{giocatore?.nome}{' '}{giocatore?.cognome}</p>
            </div>
            {errore && <div className="error-message">{errore}</div>}
            {messaggio && <div className="success-message">{messaggio}</div>}
            <div className="management-section" style={{ marginBottom:'14px' }}>
              <button type="button" onClick={() => { setErrore(''); setMessaggio(''); setVista('giocatore-assenze') }} style={{ width:'100%', minHeight:'76px', padding:'16px 18px', border:'1px solid #b9d8ff', borderRadius:'16px', background:'#eef6ff', color:'#145dcc', textAlign:'left', cursor:'pointer', boxSizing:'border-box' }}>
                <div style={{ fontSize:'17px', fontWeight:900 }}>ASSENZE ALLENAMENTO</div>
                <div style={{ marginTop:'5px', fontSize:'12px', fontWeight:600, color:'#52708f' }}>Segnala o modifica un'assenza</div>
              </button>
            </div>
            <div className="management-section">
              <button type="button" onClick={() => { setErrore(''); setMessaggio(''); setVista('giocatore-visite') }} style={{ width:'100%', minHeight:'76px', padding:'16px 18px', border:'1px solid #b7e0c2', borderRadius:'16px', background:'#f1fbf4', color:'#18733a', textAlign:'left', cursor:'pointer', boxSizing:'border-box' }}>
                <div style={{ fontSize:'17px', fontWeight:900 }}>VISITA MEDICA</div>
                <div style={{ marginTop:'5px', fontSize:'12px', fontWeight:600, color:'#52705f' }}>Comunica lo stato della tua visita</div>
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (vista === 'giocatore-visite') {
    return (
      <div className="app">
        <main className="player-container">
          <div className="player-card management-card">
            <button
              className="back-button"
              onClick={() => { setErrore(''); setMessaggio(''); setVista('giocatore') }}
            >
              ← Area Giocatore
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


            {/* =================================================
                VISITA MEDICA
               ================================================= */}

            <div
              className="management-section"
              style={{
                marginBottom: '20px',
              }}
            >
              <div className="section-title">
                <h2>Visita medica</h2>
              </div>

              <div
                style={{
                  padding: '18px',
                  border: '1px solid #dbe3ec',
                  borderRadius: '18px',
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#102b50',
                    marginBottom: '14px',
                  }}
                >
                  Hai effettuato la visita medica sportiva?
                </div>

                {visitaMedica?.stato && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {visitaMedica.stato === 'effettuata'
                      ? '✓ Visita medica effettuata'
                      : visitaMedica.stato === 'programmata'
                        ? `📅 Visita programmata il ${new Date(
                            visitaMedica.data_programmata + 'T00:00:00'
                          ).toLocaleDateString('it-IT')}`
                        : 'Visita medica non ancora effettuata'}
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => salvaVisitaMedica('effettuata')}
                    disabled={caricamento}
                    style={{
                      minHeight: '48px',
                      padding: '10px 12px',
                      border: '1px solid #b7e0c2',
                      borderRadius: '12px',
                      background: '#f1fbf4',
                      color: '#18733a',
                      fontWeight: 800,
                      cursor: caricamento ? 'default' : 'pointer',
                    }}
                  >
                    ✓ SÌ, EFFETTUATA
                  </button>

                  <button
                    type="button"
                    onClick={() => salvaVisitaMedica('non_effettuata')}
                    disabled={caricamento}
                    style={{
                      minHeight: '48px',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#64748b',
                      fontWeight: 800,
                      cursor: caricamento ? 'default' : 'pointer',
                    }}
                  >
                    NO, NON ANCORA
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMostraDataVisitaMedica(!mostraDataVisitaMedica)}
                  disabled={caricamento}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    marginTop: '10px',
                    padding: '10px 12px',
                    border: '1px solid #b9d8ff',
                    borderRadius: '12px',
                    background: '#eef6ff',
                    color: '#145dcc',
                    fontWeight: 800,
                    cursor: caricamento ? 'default' : 'pointer',
                  }}
                >
                  📅 DEVO ESEGUIRLA IL...
                </button>

                {mostraDataVisitaMedica && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                      Data della visita
                    </label>
                    <input
                      type="date"
                      value={dataVisitaMedica}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDataVisitaMedica(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => salvaVisitaMedica('programmata', dataVisitaMedica)}
                      disabled={caricamento || !dataVisitaMedica}
                      className="main-button full-width"
                      style={{ marginTop: '10px' }}
                    >
                      {caricamento ? 'Salvataggio...' : 'Conferma data'}
                    </button>
                  </div>
                )}
              </div>
            </div>


          </div>
        </main>
      </div>
    )
  }

  if (vista === 'giocatore-assenze') {
    return (
      <div className="app">
        <main className="player-container">
          <div className="player-card management-card">
            <button
              className="back-button"
              onClick={() => { setErrore(''); setMessaggio(''); setVista('giocatore') }}
            >
              ← Area Giocatore
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

                          {!allenamento.stato && (
                            <div
                              style={{
                                marginTop: '10px',
                                fontSize: '12px',
                                lineHeight: 1.4,
                                opacity: 0.75,
                              }}
                            >
                              {assenzaConsentita(allenamento)
                                ? 'Assenza comunicabile fino a 1 ora prima dell’allenamento.'
                                : 'Termine scaduto. Per emergenze dell’ultimo minuto contattare direttamente la società.'}
                            </div>
                          )}

                        </div>

                        {!allenamento.stato && (

                          <div className="attendance-buttons">

                            <button
                              className="absent-button"
                              onClick={() => {
                                setMotivoAssenzaSelezionato(
                                  allenamento.motivazione || ''
                                )
                                setRecuperoAllenamento(
                                  Boolean(allenamento.recupero)
                                )
                                setDataRecupero(
                                  allenamento.data_recupero || ''
                                )
                                setOraRecupero(
                                  allenamento.ora_recupero?.slice(0, 5) || ''
                                )
                                setAllenamentoSelezionato(
                                  allenamento
                                )
                              }}
                              disabled={
                                caricamento ||
                                !assenzaConsentita(allenamento)
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
                                onClick={() => {
                                  setMotivoAssenzaSelezionato(
                                    allenamento.motivazione || ''
                                  )
                                  setRecuperoAllenamento(
                                    Boolean(allenamento.recupero)
                                  )
                                  setDataRecupero(
                                    allenamento.data_recupero || ''
                                  )
                                  setOraRecupero(
                                    allenamento.ora_recupero?.slice(0, 5) || ''
                                  )
                                  setAllenamentoSelezionato(
                                    allenamento
                                  )
                                }}
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

                        {allenamentoSelezionato?.id === allenamento.id && (
                          <div
                            style={{
                              gridColumn: '1 / -1',
                              width: '100%',
                              minWidth: 0,
                              marginTop: '14px',
                              padding: '18px',
                              border: '1px solid #dbe3ec',
                              borderRadius: '18px',
                              background: '#f8fafc',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                width: '100%',
                                marginBottom: '8px',
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: '20px',
                                  lineHeight: 1.2,
                                  fontWeight: 800,
                                  color: '#102b50',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {allenamento.stato === 'assente'
                                  ? 'Modifica assenza'
                                  : 'Segnala assenza'}
                              </h3>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAllenamentoSelezionato(null)
                                  setMotivoAssenzaSelezionato('')
                                  setRecuperoAllenamento(false)
                                  setDataRecupero('')
                                  setOraRecupero('')
                                }}
                                style={{
                                  flex: '0 0 auto',
                                  width: '42px',
                                  height: '42px',
                                  border: 'none',
                                  borderRadius: '12px',
                                  background: '#e8eef5',
                                  color: '#355675',
                                  fontSize: '26px',
                                  lineHeight: 1,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                aria-label="Chiudi"
                              >
                                ×
                              </button>
                            </div>

                            <p
                              style={{
                                margin: '0 0 14px',
                                fontSize: '15px',
                                lineHeight: 1.4,
                                color: '#5e7691',
                              }}
                            >
                              Seleziona il motivo dell'assenza:
                            </p>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'repeat(2, minmax(0, 1fr))',
                                gap: '10px',
                                width: '100%',
                              }}
                            >
                              {[
                                ['Salute', '🩺'],
                                ['Lavoro', '💼'],
                                ['Famiglia', '👨‍👩‍👧'],
                                ['Infortunio', '🩹'],
                                ['Vacanza', '🏖️'],
                                ['Esami', '📚'],
                              ].map(([motivo, icona]) => (
                                <button
                                  key={motivo}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMotivoAssenzaSelezionato(motivo)
                                  }}
                                  disabled={caricamento}
                                  style={{
                                    minWidth: 0,
                                    minHeight: '58px',
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d8e1eb',
                                    borderRadius: '14px',
                                    background:
                                      motivoAssenzaSelezionato === motivo
                                        ? '#eef6ff'
                                        : '#ffffff',
                                    color: '#102b50',
                                    cursor: caricamento
                                      ? 'default'
                                      : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: '10px',
                                    boxSizing: 'border-box',
                                    fontSize: '14px',
                                    fontWeight: 800,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      flex: '0 0 38px',
                                      borderRadius: '11px',
                                      background: '#eef2f7',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '20px',
                                    }}
                                  >
                                    {icona}
                                  </span>

                                  <span
                                    style={{
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {motivo.toUpperCase()}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {motivoAssenzaSelezionato && (
                              <div
                                style={{
                                  marginTop: '16px',
                                  padding: '16px',
                                  border: '1px solid #d8e1eb',
                                  borderRadius: '16px',
                                  background: '#ffffff',
                                }}
                              >
                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    color: '#102b50',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={recuperoAllenamento}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setRecuperoAllenamento(checked)
                                      if (!checked) {
                                        setDataRecupero('')
                                        setOraRecupero('')
                                      }
                                    }}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      accentColor: '#1769e0',
                                      flex: '0 0 auto',
                                    }}
                                  />
                                  <span>
                                    Recupero l’allenamento al campo in accordo con il mister
                                  </span>
                                </label>

                                {recuperoAllenamento && (
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                                      gap: '10px',
                                      marginTop: '14px',
                                    }}
                                  >
                                    <label
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: '#5e7691',
                                      }}
                                    >
                                      Giorno recupero
                                      <input
                                        type="date"
                                        value={dataRecupero}
                                        onChange={(e) => setDataRecupero(e.target.value)}
                                        style={{
                                          width: '100%',
                                          minHeight: '48px',
                                          padding: '0 12px',
                                          border: '1px solid #d8e1eb',
                                          borderRadius: '12px',
                                          boxSizing: 'border-box',
                                          fontSize: '15px',
                                          color: '#102b50',
                                          background: '#fff',
                                        }}
                                      />
                                    </label>

                                    <label
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: '#5e7691',
                                      }}
                                    >
                                      Orario recupero
                                      <input
                                        type="time"
                                        value={oraRecupero}
                                        onChange={(e) => setOraRecupero(e.target.value)}
                                        style={{
                                          width: '100%',
                                          minHeight: '48px',
                                          padding: '0 12px',
                                          border: '1px solid #d8e1eb',
                                          borderRadius: '12px',
                                          boxSizing: 'border-box',
                                          fontSize: '15px',
                                          color: '#102b50',
                                          background: '#fff',
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    salvaPresenza(
                                      allenamentoSelezionato,
                                      'assente',
                                      motivoAssenzaSelezionato,
                                      recuperoAllenamento,
                                      dataRecupero,
                                      oraRecupero
                                    )
                                  }}
                                  disabled={
                                    caricamento ||
                                    !motivoAssenzaSelezionato
                                  }
                                  style={{
                                    width: '100%',
                                    minHeight: '50px',
                                    marginTop: '14px',
                                    border: 'none',
                                    borderRadius: '14px',
                                    background: '#1769e0',
                                    color: '#fff',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  SALVA ASSENZA
                                </button>
                              </div>
                            )}
                          </div>
                        )}

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

  // =====================================================
  // AREA DIRIGENZA - DETTAGLIO ASSENZE
  // =====================================================

  if (
    vista === 'dirigenza-assenze' &&
    allenamentoPresenze
  ) {
    const assenti =
      presenzeAllenamento.filter(
        (item) => item.stato === 'assente'
      )

    const iconeMotivo = {
      Salute: '🩺',
      Lavoro: '💼',
      Famiglia: '🏠',
      Infortunio: '🩹',
      Vacanza: '🏖️',
      Esami: '📚',
    }

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
              <div
                style={{
                  marginTop: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    marginBottom: '18px',
                    padding: '16px 18px',
                    borderRadius: '16px',
                    background: '#f1f5f9',
                    boxSizing: 'border-box',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        letterSpacing: '0.08em',
                        marginBottom: '4px',
                        opacity: 0.65,
                      }}
                    >
                      ASSENTI
                    </div>

                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: '700',
                      }}
                    >
                      Giocatori che hanno segnalato
                      l’assenza
                    </div>
                  </div>

                  <strong
                    style={{
                      flexShrink: 0,
                      fontSize: '28px',
                      lineHeight: 1,
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
                      padding: '24px 18px',
                      borderRadius: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '28px',
                        marginBottom: '8px',
                      }}
                    >
                      ✓
                    </div>

                    <strong>
                      Nessuna assenza segnalata
                    </strong>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '52px minmax(0, 1fr) minmax(100px, 0.7fr)',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        borderBottom:
                          '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: '800',
                        letterSpacing: '0.06em',
                      }}
                    >
                      <span></span>
                      <span>GIOCATORE</span>
                      <span>MOTIVO</span>
                    </div>

                    {assenti.map(
                      (item, index) => {
                        const nome =
                          item.giocatori?.nome || ''
                        const cognome =
                          item.giocatori?.cognome || ''
                        const motivo =
                          item.motivazione ||
                          'Motivo non indicato'
                        const icona =
                          iconeMotivo[motivo] ||
                          'ℹ️'

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                '52px minmax(0, 1fr) minmax(100px, 0.7fr)',
                              alignItems: 'center',
                              gap: '10px',
                              minHeight: '58px',
                              padding: '10px 14px',
                              boxSizing: 'border-box',
                              borderBottom:
                                index ===
                                assenti.length - 1
                                  ? 'none'
                                  : '1px solid #edf2f7',
                            }}
                          >
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f1f5f9',
                                fontSize: '18px',
                              }}
                              title={motivo}
                            >
                              {icona}
                            </div>

                            <div
                              style={{
                                minWidth: 0,
                                fontSize: '15px',
                                fontWeight: '800',
                                textTransform:
                                  'uppercase',
                              }}
                            >
                              {cognome}{' '}
                              <span
                                style={{
                                  textTransform:
                                    'none',
                                }}
                              >
                                {nome}
                              </span>
                            </div>

                            <div
                              style={{
                                minWidth: 0,
                                fontSize: '13px',
                                fontWeight: '700',
                                wordBreak:
                                  'break-word',
                              }}
                            >
                              <div>{motivo}</div>
                              {item.recupero && item.data_recupero && item.ora_recupero && (
                                <div
                                  style={{
                                    marginTop: '4px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    color: '#1769e0',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  Recuperato il {new Date(
                                    `${item.data_recupero}T00:00:00`
                                  ).toLocaleDateString('it-IT')} alle {item.ora_recupero.slice(0, 5)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                )}
              </div>
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
            <button className="back-button" onClick={logoutDirigenza}>← Esci dalla dirigenza</button>
            <div className="player-header">
              <div className="player-icon">🔐</div>
              <h1>Area Dirigenza</h1>
              <p>SS. Pietro e Paolo A.C. · 2026 / 27</p>
            </div>
            {errore && <div className="error-message">{errore}</div>}
            {messaggio && <div className="success-message">{messaggio}</div>}
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

              {giocatoriInAttesa.length > 0 && (

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


            <div className="management-section" style={{ marginTop:'18px' }}>
              <button type="button" onClick={() => { setErrore(''); setMessaggio(''); setVista('dirigenza-assenze') }} style={{ width:'100%', minHeight:'68px', padding:'14px 16px', border:'1px solid #b9d8ff', borderRadius:'14px', background:'#eef6ff', color:'#145dcc', textAlign:'left', cursor:'pointer', boxSizing:'border-box' }}>
                <div style={{ fontSize:'16px', fontWeight:900 }}>CONTROLLA ASSENZE</div>
                <div style={{ marginTop:'4px', fontSize:'12px', fontWeight:600, color:'#52708f' }}>Visualizza le assenze segnalate</div>
              </button>
            </div>
            <div className="management-section">
              <button type="button" onClick={() => { setErrore(''); setMessaggio(''); setVista('dirigenza-visite') }} style={{ width:'100%', minHeight:'68px', padding:'14px 16px', border:'1px solid #b7e0c2', borderRadius:'14px', background:'#f1fbf4', color:'#18733a', textAlign:'left', cursor:'pointer', boxSizing:'border-box' }}>
                <div style={{ fontSize:'16px', fontWeight:900 }}>CONTROLLA VISITE MEDICHE</div>
                <div style={{ marginTop:'4px', fontSize:'12px', fontWeight:600, color:'#52705f' }}>Controlla visite effettuate e programmate</div>
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (vista === 'dirigenza-visite') {
    return (
      <div className="app">
        <main className="player-container">
          <div className="player-card management-card">
            <button
              className="back-button"
              onClick={() => { setErrore(''); setMessaggio(''); setVista('dirigenza') }}
            >
              ← Area Dirigenza
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
                VISITE MEDICHE
               ================================================= */}

            <div className="management-section">
              <div className="section-title">
                <h2>CONTROLLA VISITE MEDICHE</h2>
                <span className="players-count">
                  {visiteMediche.length}
                </span>
              </div>

              {visiteMediche.length === 0 ? (
                <div className="empty-box">
                  <div className="empty-icon">✓</div>
                  <strong>Nessuna visita medica registrata</strong>
                  <p>I giocatori che indicano visita effettuata o programmata compariranno qui.</p>
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  {visiteMediche.map((visita, index) => (
                    <div
                      key={visita.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '14px 16px',
                        borderBottom: index < visiteMediche.length - 1 ? '1px solid #e8edf3' : 'none',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#102b50', fontSize: '14px' }}>
                          {visita.giocatori?.cognome} {visita.giocatori?.nome}
                        </div>
                      </div>

                      <div
                        style={{
                          flexShrink: 0,
                          padding: '7px 10px',
                          borderRadius: '999px',
                          background: visita.stato === 'effettuata' ? '#eefbf2' : '#eef6ff',
                          color: visita.stato === 'effettuata' ? '#18733a' : '#145dcc',
                          fontSize: '12px',
                          fontWeight: 800,
                          textAlign: 'center',
                        }}
                      >
                        {visita.stato === 'effettuata'
                          ? '✓ EFFETTUATA'
                          : `📅 PROGRAMMATA IL ${new Date(
                              visita.data_programmata + 'T00:00:00'
                            ).toLocaleDateString('it-IT')}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    )
  }

  if (vista === 'dirigenza-assenze') {
    const allenamentiAttivi = allenamenti.filter(
      (allenamento) => allenamento.aperto
    )

    const allenamentiArchiviati = allenamenti.filter(
      (allenamento) => !allenamento.aperto
    )

    return (
      <div className="app">
        <main className="player-container">
          <div className="player-card management-card">
            <button
              className="back-button"
              onClick={() => { setErrore(''); setMessaggio(''); setVista('dirigenza') }}
            >
              ← Area Dirigenza
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
                ALLENAMENTI
               ================================================= */}

            <div className="management-section">

              <div className="section-title">

                <h2>
                  CONTROLLA ASSENZE
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

              {allenamentiAttivi.length ===
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

                  {allenamentiAttivi.map(
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
                          style={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            width: '100%',
                            marginTop: '16px',
                          }}
                        >
                          <div
                            className="view-attendance"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              apriPresenzeAllenamento(allenamento)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                apriPresenzeAllenamento(allenamento)
                              }
                            }}
                            style={{
                              width: '100%',
                              minHeight: '46px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '10px 14px',
                              border: '1px solid #b9d8ff',
                              borderRadius: '10px',
                              background: '#eef6ff',
                              color: '#145dcc',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              fontWeight: '800',
                              fontSize: '14px',
                              lineHeight: 1.2,
                              textAlign: 'center',
                            }}
                          >
                            Vedi assenze
                          </div>

                          {allenamento.aperto && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                archiviaAllenamento(allenamento)
                              }}
                              disabled={caricamento}
                              style={{
                                width: '100%',
                                minHeight: '38px',
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '9px',
                                background: '#f8fafc',
                                color: '#64748b',
                                cursor: caricamento
                                  ? 'default'
                                  : 'pointer',
                                boxSizing: 'border-box',
                                fontWeight: '700',
                                fontSize: '12px',
                                lineHeight: 1.2,
                                textAlign: 'center',
                              }}
                            >
                              Archivia allenamento
                            </button>
                          )}
                        </div>

                      </div>

                    )
                  )}

                </div>
              )}

              <div
                style={{
                  marginTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setMostraArchivioAllenamenti(
                      !mostraArchivioAllenamenti
                    )
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    fontWeight: '800',
                    fontSize: '17px',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    🗂️ Archivio allenamenti
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        minWidth: '30px',
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e2e8f0',
                        fontSize: '13px',
                      }}
                    >
                      {allenamentiArchiviati.length}
                    </span>

                    <span style={{ fontSize: '22px' }}>
                      {mostraArchivioAllenamenti ? '⌃' : '⌄'}
                    </span>
                  </span>
                </button>

                {mostraArchivioAllenamenti && (
                  <div style={{ marginTop: '14px' }}>
                    {allenamentiArchiviati.length === 0 ? (
                      <div className="empty-box">
                        <div className="empty-icon">
                          🗂️
                        </div>

                        <strong>
                          Nessun allenamento archiviato
                        </strong>

                        <p>
                          Gli allenamenti archiviati
                          compariranno qui.
                        </p>
                      </div>
                    ) : (
                      <div className="training-list">
                        {allenamentiArchiviati.map(
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
                                      weekday: 'short',
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

                              <div className="training-status closed">
                                Archiviato
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
                                  if (
                                    e.key === 'Enter' ||
                                    e.key === ' '
                                  ) {
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
                )}
              </div>

            </div>

          </div>
        </main>
      </div>
    )
  }

}

export default App
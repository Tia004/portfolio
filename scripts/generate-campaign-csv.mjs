import fs from 'fs';
import path from 'path';

// All 100 records from the user prompt
const data = [
  {
    email: "info@mantovamotorgiardino.it",
    nome: "",
    azienda: "Mantova Motor Giardino",
    oggetto: "Completare la pagina servizi e raccogliere richieste",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Sul vostro sito ho trovato la pagina pubblica servizi (services-1) con testi segnaposto in inglese. Potrei completarla con i servizi reali e due richieste guidate, una per il noleggio e una per l'assistenza. Sarebbe un intervento circoscritto, utile a rendere più chiaro cosa chiedere e a chi.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@hydroplants.it",
    nome: "",
    azienda: "Hydroplants",
    oggetto: "Il PDF del progetto direttamente nel modulo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Nella pagina contatti chiedete un PDF dell'area da progettare e distinguete verde e outdoor. Potrei realizzare un modulo con caricamento del PDF e destinazione al reparto corretto, così da raccogliere progetto e recapiti nella stessa richiesta.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "giovanisnc@libero.it",
    nome: "",
    azienda: "Falegnameria Giovani",
    oggetto: "Foto, misure e finiture in una sola richiesta",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Nelle vostre FAQ indicate le informazioni utili per un preventivo: misure, foto e finiture. Potrei trasformare queste indicazioni in una scheda guidata sul sito, con allegati e riepilogo del progetto. L'obiettivo sarebbe ricevere richieste più complete già al primo contatto.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@inteext.it",
    nome: "",
    azienda: "Ristrutturazioni Roma – Inteext",
    oggetto: "Un archivio delle richieste dal sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Il vostro modulo contatti dichiara di non archiviare i messaggi sul sito. Se oggi non avete già uno strumento interno che li raccoglie, potrei aggiungere una dashboard essenziale con richieste, stato del preventivo e prossimo ricontatto.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info.festoro@gmail.com",
    nome: "",
    azienda: "Festoro Catering",
    oggetto: "Inviare il preventivo direttamente dal sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Nella pagina contatti indicizzata è spiegato che il modulo preventivo apre l'app di posta del visitatore. Se il funzionamento è ancora questo, potrei aggiungere l'invio diretto dal sito, con conferma di ricezione e un elenco delle richieste per il vostro team.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "affumico@gmail.com",
    nome: "",
    azienda: "Affumico",
    oggetto: "Richieste delivery anche dal sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Ho visto che avete già la prenotazione online dei tavoli, mentre per il delivery indicate l'ordine telefonico. Potrei aggiungere una pagina per raccogliere richieste di ordine e fascia oraria, lasciando a voi la conferma finale. Un primo passo semplice, da valutare in base ai vostri volumi.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "agriandrea92@gmail.com",
    nome: "",
    azienda: "Corte Capiluppia",
    oggetto: "Una pagina dedicata ai meeting della corte",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Oltre al soggiorno, presentate una sala meeting da circa 50 persone. Potrei creare una pagina dedicata agli incontri aziendali, con capienza, servizi e richiesta per data e partecipanti, così da distinguere questi contatti dalle richieste per le camere.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@daligabue.it",
    nome: "",
    azienda: "Da Ligabue",
    oggetto: "Una pagina per acquisire eventi aziendali",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Nella pagina catering raccontate l'ampliamento dell'offerta con chef interni e un riferimento commerciale. Potrei realizzare una pagina dedicata agli eventi aziendali, con un brief per data, ospiti e servizi richiesti e un piccolo elenco delle proposte da seguire.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "francorossibologna@hotmail.it",
    nome: "",
    azienda: "Ristorante Franco Rossi",
    oggetto: "Preventivi catering con un brief completo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Ho visto la vostra proposta catering per aziende e cerimonie. Potrei aggiungere una richiesta guidata con data, location, ospiti e fascia di spesa, così da avere un brief utile prima di preparare il preventivo o fissare un incontro.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "agriturismoscannaporco@gmail.com",
    nome: "",
    azienda: "Agriturismo Scannaporco",
    oggetto: "Camere e richieste di soggiorno sul sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Ho consultato le informazioni sulle vostre camere e sui servizi dell'agriturismo. Potrei curare un aggiornamento essenziale dei testi e del percorso di richiesta soggiorno, raccogliendo date, ospiti e preferenze in un unico messaggio. Partirei dalle pagine più utili a chi sta scegliendo dove pernottare.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@goodvibes.cloud",
    nome: "",
    azienda: "Good Vibes Food Project",
    oggetto: "Una pagina dedicata ai vostri eventi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Good Vibes Food Project ho pensato a una pagina eventi con richiesta guidata per sede, data e numero di ospiti. Dal vostro sito emerge questo punto: eventi nelle proprie sedi e in location esterne.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@il-noce.it",
    nome: "",
    azienda: "Vivaio Il Noce",
    oggetto: "Consegne e orari stagionali sul sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Vivaio Il Noce ho pensato a una pagina richieste consegna e un pannello semplice per aggiornare gli orari stagionali. Dal vostro sito emerge questo punto: consegne a domicilio e allestimento fioriere.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@ts-serramenti.it",
    nome: "",
    azienda: "Serramenti TS",
    oggetto: "Consulenze organizzate per showroom",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Serramenti TS ho pensato a un percorso unico per prenotare la consulenza nella sede desiderata. Dal vostro sito emerge questo punto: showroom a Porto Mantovano e Verona, appuntamenti da organizzare.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@roma-ristrutturazione.it",
    nome: "",
    azienda: "ProService – Ristrutturazione Roma",
    oggetto: "Sopralluoghi organizzati mentre siete in cantiere",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per ProService – Ristrutturazione Roma ho pensato a un modulo per prenotare il ricontatto e organizzare le richieste di sopralluogo. Dal vostro sito emerge questo punto: la pagina spiega che il team è spesso in cantiere e riceve solo su appuntamento.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@habitat.roma.it",
    nome: "",
    azienda: "Habitat Roma",
    oggetto: "Un percorso per i lavori dopo l'acquisto",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Habitat Roma ho pensato a una pagina dedicata ai lavori post-acquisto con richiesta guidata e seguito in dashboard. Dal vostro sito emerge questo punto: ristrutturazioni proposte anche dopo vendita o locazione.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@mm-arredamenti.it",
    nome: "",
    azienda: "M&M Arredamenti",
    oggetto: "Progetti e foto nella richiesta di arredo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per M&M Arredamenti ho pensato a un caricamento guidato dei progetti con foto e misure, più recapiti e orari uniformi. Dal vostro sito emerge questo punto: la pagina invita a inviare i propri progetti per il preventivo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "stylarredo.sg@gmail.com",
    nome: "",
    azienda: "Stylarredo",
    oggetto: "Un portfolio organizzato per settore",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Stylarredo ho pensato a un portfolio diviso per settore con scheda richiesta e informazioni di sede uniformi. Dal vostro sito emerge questo punto: arredi per privati, negozi, uffici e allestimenti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@bergamaschiserramenti.it",
    nome: "",
    azienda: "Bergamaschi Serramenti",
    oggetto: "Sopralluoghi e richieste da seguire",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Bergamaschi Serramenti ho pensato a un registro condiviso di richieste e sopralluoghi con promemoria interni. Dal vostro sito emerge questo punto: richieste di informazioni e assistenza su canali diversi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@milanoserramenti.net",
    nome: "",
    azienda: "Milano Serramenti SRL",
    oggetto: "Foto e quantità nel preventivo infissi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Milano Serramenti SRL ho pensato a un modulo preventivi con foto, quantità e misure indicative. Dal vostro sito emerge questo punto: preventivi gratuiti richiesti via telefono o email.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@nericatering.it",
    nome: "",
    azienda: "Neri Catering",
    oggetto: "Dalle richieste evento al preventivo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Neri Catering ho pensato a un pannello a valle del modulo esistente per assegnare le richieste e monitorare i preventivi. Dal vostro sito emerge questo punto: preventivi con campi dedicati all'evento.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@rinascitanettuno.it",
    nome: "",
    azienda: "Rinascita Nettuno",
    oggetto: "Richieste trasloco per privati e aziende",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Rinascita Nettuno ho pensato a una raccolta richieste distinta per privati e aziende con stato del sopralluogo. Dal vostro sito emerge questo punto: traslochi civili, commerciali e industriali con custodia beni.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@bolognaserramenti.it",
    nome: "",
    azienda: "Bologna Serramenti",
    oggetto: "Foto e quantità prima del sopralluogo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Bologna Serramenti ho pensato a un modulo sopralluogo con foto e numero di infissi da sostituire. Dal vostro sito emerge questo punto: rilievo misure e preventivi personalizzati a domicilio.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@pancaldiserramenti.com",
    nome: "",
    azienda: "Pancaldi Serramenti",
    oggetto: "Un modulo dedicato all'assistenza",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Pancaldi Serramenti ho pensato a un modulo assistenza separato dai nuovi preventivi con foto e dati dell'intervento. Dal vostro sito emerge questo punto: vendita e posa con manutenzione post-vendita.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@finestrissima.it",
    nome: "",
    azienda: "Finestrissima",
    oggetto: "Consulenze showroom con un brief iniziale",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Finestrissima ho pensato a una prenotazione di consulenza con orario preferito e informazioni sugli infissi. Dal vostro sito emerge questo punto: consulenza in showroom preferibilmente su appuntamento.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@smartsystemsimpianti.it",
    nome: "",
    azienda: "SmartSystems Impianti",
    oggetto: "Foto e dettagli nelle richieste di intervento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per SmartSystems Impianti ho pensato a una scheda intervento con foto e zona, raccolta in una dashboard delle richieste. Dal vostro sito emerge questo punto: installazioni civili e industriali e interventi tecnici.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@falegnameriapirondini.com",
    nome: "",
    azienda: "Falegnameria Pirondini",
    oggetto: "Foto e misure già nella richiesta preventivo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Pirondini ho pensato a un modulo preventivo con foto e misure indicative, collegato a un elenco delle richieste. Dal vostro sito emerge questo punto: consulenza personalizzata per infissi e serramenti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@mirtillocatering.com",
    nome: "",
    azienda: "Mirtillo Catering",
    oggetto: "Richieste catering private e aziendali",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Mirtillo Catering ho pensato a un brief digitale distinto per evento privato e aziendale, con elenco delle richieste. Dal vostro sito emerge questo punto: catering su misura e ristorazione collettiva.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@traslochicannone.com",
    nome: "",
    azienda: "Traslochi Cannone",
    oggetto: "Preparare il sopralluogo per il trasloco",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Traslochi Cannone ho pensato a una scheda sopralluogo che raccolga indirizzi, piani e foto prima del preventivo. Dal vostro sito emerge questo punto: contatti via telefono, WhatsApp ed email.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@dagaserramenti.it",
    nome: "",
    azienda: "Daga Serramenti",
    oggetto: "Richieste assegnate allo showroom giusto",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Daga Serramenti ho pensato a un pannello per assegnare i nuovi contatti allo showroom corretto e seguirne l'esito. Dal vostro sito emerge questo punto: più showroom con recapiti distinti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@asserramentisrl.it",
    nome: "",
    azienda: "Asserramenti",
    oggetto: "Preventivi condivisi tra showroom e ufficio",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Asserramenti ho pensato a un pannello preventivi per passare richieste e allegati dallo showroom all'ufficio competente. Dal vostro sito emerge questo punto: showroom Bologna, sede operativa a Casalecchio e produzione a Scandale.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "serramenti@budani.it",
    nome: "",
    azienda: "Budani",
    oggetto: "Preventivi edilizia e serramenti in un solo pannello",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Budani ho pensato a una dashboard che separi le richieste di edilizia e serramenti e mostri quali preventivi richiamare. Dal vostro sito emerge questo punto: due linee di attività e richiesta di offerta online.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "agriturismo.corte.vignola@gmail.com",
    nome: "",
    azienda: "Corte Vignola",
    oggetto: "Richieste soggiorno per camere e appartamenti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Corte Vignola ho pensato a una richiesta soggiorno che distingua camera, appartamento e servizi per ciclisti. Dal vostro sito emerge questo punto: camere e appartamenti, con interesse per il cicloturismo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@stefra.it",
    nome: "",
    azienda: "Stefra",
    oggetto: "Brief e materiali per i nuovi progetti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Stefra ho pensato a un primo modulo di area progetto per raccogliere brief e materiali dai clienti. Dal vostro sito emerge questo punto: progettazione e produzione di ambienti commerciali.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "agriturismoalbana@gmail.com",
    nome: "",
    azienda: "Agriturismo Albana",
    oggetto: "Date e informazioni per l'arrivo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Agriturismo Albana ho pensato a una richiesta soggiorno guidata con email di conferma e informazioni per l'arrivo. Dal vostro sito emerge questo punto: check-in in autonomia e regolamento della struttura.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "aziendaagricolacasavilli@hotmail.it",
    nome: "",
    azienda: "Casa Villi",
    oggetto: "Un percorso dedicato alle richieste soggiorno",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Casa Villi ho pensato a un percorso soggiorni distinto dal ristorante, con date e ospiti nella richiesta. Dal vostro sito emerge questo punto: camere e appartamenti con contatto per prenotazioni.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@lezrent.com",
    nome: "",
    azienda: "LezRent – Lez Group",
    oggetto: "Articoli, date e ritiro in una scheda",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per LezRent – Lez Group ho pensato a una scheda richiesta con data, articoli e modalità di ritiro, visibile al team. Dal vostro sito emerge questo punto: noleggio con ritiro merce in magazzino.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "commerciale@rentaltime.it",
    nome: "",
    azienda: "Rental Time",
    oggetto: "Una lista articoli per chiedere il noleggio",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Rental Time ho pensato a un carrello di richiesta preventivo per articoli e quantità, senza pagamento online. Dal vostro sito emerge questo punto: numerose categorie di materiali a noleggio per eventi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@viss.it",
    nome: "",
    azienda: "Viss",
    oggetto: "Un pannello per le richieste degli showroom",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Viss ho pensato a un primo pannello condiviso per i nuovi preventivi tra showroom e logistica. Dal vostro sito emerge questo punto: tre showroom e una sede logistica.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "ronchigiardini@gmail.com",
    nome: "",
    azienda: "Ronchi Giardini",
    oggetto: "Un portfolio per i progetti di giardino",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Ronchi Giardini ho pensato a un portfolio dei lavori e una richiesta guidata per sopralluoghi e manutenzioni. Dal vostro sito emerge questo punto: progettazione, potature e impianti di irrigazione.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@lafalegnameriarampini.it",
    nome: "",
    azienda: "La Falegnameria Rampini",
    oggetto: "Disegni e aggiornamenti per il cliente",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per La Falegnameria Rampini ho pensato a una piccola area progetto per condividere disegni approvati e aggiornamenti con il cliente. Dal vostro sito emerge questo punto: produzione personalizzata seguita dal cliente nelle varie fasi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@quadraserramenti.com",
    nome: "",
    azienda: "Quadra Serramenti",
    oggetto: "Un'area cliente per seguire il proprio intervento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Quadra Serramenti ho pensato a una piccola area cliente per consultare avanzamento e documenti del proprio intervento. Dal vostro sito emerge questo punto: processo dichiarato in dieci fasi e assistenza post-vendita.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@agriturismo-sangirolamo.it",
    nome: "",
    azienda: "Corte San Girolamo",
    oggetto: "Richieste per gruppi di ciclisti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Corte San Girolamo ho pensato a una richiesta dedicata ai gruppi di ciclisti con data, persone e necessità di ristoro. Dal vostro sito emerge questo punto: ristoro per gruppi e ciclisti su prenotazione, oltre alle camere.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "catering@farsiprossimo.it",
    nome: "",
    azienda: "M’ama Food",
    oggetto: "Un brief per catering e degustazioni",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per M’ama Food ho pensato a un modulo per scegliere tipo di evento, preferenze alimentari e appuntamento degustazione. Dal vostro sito emerge questo punto: catering per eventi e degustazioni su richiesta.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@milanoserramenti.it",
    nome: "",
    azienda: "Milano Serramenti by Piesseti",
    oggetto: "Consulenze per sede e prodotto",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Milano Serramenti by Piesseti ho pensato a una richiesta di consulenza per sede con data preferita e tipo di serramento. Dal vostro sito emerge questo punto: showroom Milano e sede a Verano Brianza.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "amm.pirontifalegnameria@gmail.com",
    nome: "",
    azienda: "Falegnameria Pironti Franco",
    oggetto: "Foto del danno nella richiesta di riparazione",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Pironti Franco ho pensato a una richiesta riparazione con foto del danno e zona, consultabile da dashboard. Dal vostro sito emerge questo punto: ripristino e restauro di porte e finestre.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@falegnameriaprando.it",
    nome: "",
    azienda: "Falegnameria Prando",
    oggetto: "Una scheda per casa e attività commerciali",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Prando ho pensato a una scheda richiesta che distingua casa e negozio e raccolga foto e misure. Dal vostro sito emerge questo punto: arredi per abitazioni e attività commerciali.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "aj.falegnameria84@gmail.com",
    nome: "",
    azienda: "AJ Falegnameria",
    oggetto: "Un modulo per i nuovi progetti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per AJ Falegnameria ho pensato a una pagina richiesta progetto con fotografie e misure indicative. Dal vostro sito emerge questo punto: laboratorio con contatto diretto.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "hello@arbaro.it",
    nome: "",
    azienda: "Arbaro",
    oggetto: "Richieste su misura accanto allo shop",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Arbaro ho pensato a un modulo su misura per raccogliere i progetti personalizzati accanto allo shop esistente. Dal vostro sito emerge questo punto: vendita di prodotti, eventi ed esposizioni comunicati agli iscritti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "space.party@yahoo.it",
    nome: "",
    azienda: "The Space Party",
    oggetto: "Un brief per composizioni e noleggi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per The Space Party ho pensato a un configuratore semplice della richiesta festa con campi dedicati e riepilogo. Dal vostro sito emerge questo punto: prodotto, quantità, colori, data e consegna richiesti nei messaggi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@stepaparinos.com",
    nome: "",
    azienda: "Traslochi Stepaparinos",
    oggetto: "Le richieste del form in una dashboard",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Traslochi Stepaparinos ho pensato a una dashboard che trasformi i dati del modulo in schede sopralluogo e preventivo. Dal vostro sito emerge questo punto: raccolta online dei principali vincoli del trasloco.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "traslochicaracciolo@gmail.com",
    nome: "",
    azienda: "Caracciolo Service & Traslochi",
    oggetto: "La prossima azione per ogni preventivo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Caracciolo Service & Traslochi ho pensato a un pannello delle richieste con responsabile e prossima azione per privati e aziende. Dal vostro sito emerge questo punto: traslochi, archivi, deposito e servizi logistici.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "request@magevents.it",
    nome: "",
    azienda: "MAG Events",
    oggetto: "Il catalogo direttamente dal sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per MAG Events ho pensato a una consegna del catalogo direttamente dal sito e un archivio delle richieste per area. Dal vostro sito emerge questo punto: richiesta del catalogo con invio tramite WhatsApp.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "cobi@cobimeccanica.it",
    nome: "",
    azienda: "COBI Meccanica",
    oggetto: "Richieste di lavorazione con allegati",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per COBI Meccanica ho pensato a un modulo di richiesta lavorazione con allegati e un elenco condiviso dei preventivi. Dal vostro sito emerge questo punto: uffici tecnico, commerciale, produzione e qualità distinti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@prometeomeccanica.it",
    nome: "",
    azienda: "Prometeo Meccanica",
    oggetto: "Un brief tecnico per i preventivi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Prometeo Meccanica ho pensato a una richiesta tecnica con quantità, tempi e disegni allegati per preparare i preventivi. Dal vostro sito emerge questo punto: richieste raccolte tramite un modulo generico.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@omfsrl.com",
    nome: "",
    azienda: "O.M.F. Oleodinamica Meccanica",
    oggetto: "Disegni e quantità nella richiesta CNC",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per O.M.F. Oleodinamica Meccanica ho pensato a un ingresso dedicato alle richieste di lavorazione con file tecnici e stato del preventivo. Dal vostro sito emerge questo punto: parco macchine e lavorazioni di precisione presentati online.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "officina@autosoccorsomodena.com",
    nome: "",
    azienda: "Autosoccorso SNC",
    oggetto: "Un pannello per gli appuntamenti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Autosoccorso SNC ho pensato a un piccolo pannello per gestire gli appuntamenti ricevuti e le conferme ai clienti. Dal vostro sito emerge questo punto: appuntamenti con targa, vettura e tipo di intervento.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@artdesignmodena.it",
    nome: "",
    azienda: "Art Design Modena",
    oggetto: "Preparare meglio la consulenza d'arredo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Art Design Modena ho pensato a una scheda pre-consulenza con ambienti, misure indicative e stile desiderato. Dal vostro sito emerge questo punto: consulenze su appuntamento e arredo personalizzato.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "enrico@giardinieremodena.it",
    nome: "",
    azienda: "Gardening 9010",
    oggetto: "Foto e superficie prima del sopralluogo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Gardening 9010 ho pensato a una richiesta sopralluogo con foto e superficie, distinta per progetto e manutenzione. Dal vostro sito emerge questo punto: giardini, terrazzi, irrigazione e noleggio piante.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "falegnamerialessinia@gmail.com",
    nome: "",
    azienda: "Falegnameria Lessinia",
    oggetto: "Un modulo preventivi per prodotto",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Lessinia ho pensato a un modulo di richiesta per prodotto con foto e quantità, integrato nel sito attuale. Dal vostro sito emerge questo punto: prodotti in legno, PVC e alluminio con personalizzazioni.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@milanoservice.com",
    nome: "",
    azienda: "Milano Service Traslochi",
    oggetto: "Trasloco e deposito nella stessa richiesta",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Milano Service Traslochi ho pensato a una scheda preventivo con dati logistici e opzione deposito mobili. Dal vostro sito emerge questo punto: sede operativa con deposito e richieste di trasloco.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "serramentipadovasrl@gmail.com",
    nome: "",
    azienda: "Serramenti Padova",
    oggetto: "Foto e misure prima dell'appuntamento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Serramenti Padova ho pensato a una scheda pre-appuntamento per raccogliere foto e misure prima della visita. Dal vostro sito emerge questo punto: consulenze showroom prenotabili online.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@sonciniequintavalla.com",
    nome: "",
    azienda: "Soncini & Quintavalla",
    oggetto: "Una scheda prima della consulenza",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Soncini & Quintavalla ho pensato a una scheda progetto con tipologia di arredo e immagini prima della consulenza. Dal vostro sito emerge questo punto: consulenze e preventivi per lavori di falegnameria.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "pirozziumberto@yahoo.it",
    nome: "",
    azienda: "Falegnameria Pirozzi",
    oggetto: "Progetti e allegati nei preventivi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Pirozzi ho pensato a un modulo progetto con allegati e testi uniformi, collegato all'elenco dei preventivi. Dal vostro sito emerge questo punto: richieste gestite attraverso un modulo generico.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@salvadoriserramenti.it",
    nome: "",
    azienda: "Salvadori Serramenti",
    oggetto: "Una richiesta guidata per i nuovi infissi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Salvadori Serramenti ho pensato a una richiesta guidata per tipo di infisso, foto e misure, con risposte gestibili da dashboard. Dal vostro sito emerge questo punto: produzione in legno e showroom con preventivi gratuiti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@puracatering.it",
    nome: "",
    azienda: "Pura Catering",
    oggetto: "Richieste catering assegnate per provincia",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Pura Catering ho pensato a un pannello per assegnare le richieste ai referenti territoriali e seguirne l'esito. Dal vostro sito emerge questo punto: servizi in più province e richieste tramite simulatore.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@bottegagastronomica.it",
    nome: "",
    azienda: "La Bottega Gastronomica",
    oggetto: "Una pagina dedicata ai nuovi clienti HoReCa",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per La Bottega Gastronomica ho pensato a una pagina commerciale dedicata ai nuovi clienti HoReCa con brief e richiesta campionatura. Dal vostro sito emerge questo punto: pasti aziendali, catering, HoReCa e noleggio.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@falegnameriamodonesi.it",
    nome: "",
    azienda: "Falegnameria Modonesi",
    oggetto: "Una scheda prima del rilievo misure",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Modonesi ho pensato a una scheda pre-sopralluogo con foto e misure indicative, uniformando i riferimenti alla sede. Dal vostro sito emerge questo punto: processo dichiarato di contatto, rilievo misure e preventivo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@ristrutturareroma.it",
    nome: "",
    azienda: "Ristrutturare Roma",
    oggetto: "Dal tipo di immobile al preventivo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Ristrutturare Roma ho pensato a una pagina preventivo guidata per immobile, zona e interventi desiderati. Dal vostro sito emerge questo punto: contatto per lavori di ristrutturazione.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@ri-abita.com",
    nome: "",
    azienda: "Ri-Abita",
    oggetto: "Richieste distinte per lavori e manutenzioni",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Ri-Abita ho pensato a una raccolta richieste che distingua sopralluoghi, manutenzioni e urgenze. Dal vostro sito emerge questo punto: restauri, ristrutturazioni e interventi urgenti o programmati.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@architetturaeristrutturazioni.com",
    nome: "",
    azienda: "Architettura e Ristrutturazioni",
    oggetto: "Sopralluoghi con foto e dettagli del lavoro",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Architettura e Ristrutturazioni ho pensato a un modulo sopralluogo con zona, foto e tipo di lavoro richiesto. Dal vostro sito emerge questo punto: sopralluoghi e consulenza su progetti edili.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "segreteria@pdpcatering.com",
    nome: "",
    azienda: "PdP Catering",
    oggetto: "Una dashboard per i preventivi evento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per PdP Catering ho pensato a un pannello per seguire le richieste già raccolte e preparare risposte coerenti con il marchio. Dal vostro sito emerge questo punto: richiesta evento con data e numero invitati.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "catering@artesanoroma.it",
    nome: "",
    azienda: "Artesano Roma",
    oggetto: "Richieste catering ordinate per data",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Artesano Roma ho pensato a la rifinitura del modulo e un elenco operativo di richieste per data e consegna. Dal vostro sito emerge questo punto: richieste catering con consegna, fascia oraria e budget a persona.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "daniela@cianicatering.it",
    nome: "",
    azienda: "Ciani Catering",
    oggetto: "Un riepilogo delle richieste evento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Ciani Catering ho pensato a un primo pannello riepilogativo per le richieste evento, verificando l'integrazione con gli strumenti già usati. Dal vostro sito emerge questo punto: ordini semplici online e consulenze per eventi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "romaverdegiardinaggio@gmail.com",
    nome: "",
    azienda: "Roma Verde Giardinaggio",
    oggetto: "Un brief fotografico per il giardino",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Roma Verde Giardinaggio ho pensato a una scheda sopralluogo con foto, superficie e zona di intervento. Dal vostro sito emerge questo punto: sopralluoghi, potature, irrigazione e prato pronto.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@ristrutturaamisura.it",
    nome: "",
    azienda: "Ristruttura a Misura",
    oggetto: "Sopralluoghi per abitazioni e negozi",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Ristruttura a Misura ho pensato a un brief sopralluogo differenziato per abitazione e locale commerciale. Dal vostro sito emerge questo punto: ristrutturazioni di abitazioni, negozi e uffici.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@costruzioniroma.it",
    nome: "",
    azienda: "Costruzioni Roma",
    oggetto: "Dall'offerta alla richiesta di intervento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Costruzioni Roma ho pensato a un percorso guidato dal tipo di intervento alla richiesta di preventivo. Dal vostro sito emerge questo punto: offerte distinte per appartamenti, bagni, cucine e condomini.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@traslochipaolo.it",
    nome: "",
    azienda: "Traslochi Trasporti Paolo",
    oggetto: "Partenza, arrivo e foto in una sola scheda",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Traslochi Trasporti Paolo ho pensato a un percorso preventivo per partenza, destinazione, piani e foto, seguito da dashboard. Dal vostro sito emerge questo punto: traslochi, deposito, montaggio e modifiche di mobili.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@brenadiscanzo.it",
    nome: "",
    azienda: "Brena di Scanzo",
    oggetto: "Foto e preferenze prima dell'appuntamento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Brena di Scanzo ho pensato a una scheda prima della consulenza con foto dell'ambiente e preferenze di arredo. Dal vostro sito emerge questo punto: showroom a Scanzorosciate e falegnameria a Bergamo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "iltoccoverdemodena@gmail.com",
    nome: "",
    azienda: "Il Tocco Verde",
    oggetto: "Organizzare le richieste di sopralluogo",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Il Tocco Verde ho pensato a una richiesta sopralluogo con foto e un registro dei successivi interventi concordati. Dal vostro sito emerge questo punto: giardini piccoli e medi, con manutenzione nel tempo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@serramentieserramenti.it",
    nome: "",
    azienda: "Serramenti & Serramenti",
    oggetto: "Consulenze in showroom: una piccola agenda",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Serramenti & Serramenti ho pensato a una piccola agenda delle consulenze collegata alle richieste dal sito. Dal vostro sito emerge questo punto: showroom con fasce orarie e appuntamenti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "cateringilbriccone@gmail.com",
    nome: "",
    azienda: "Il Briccone",
    oggetto: "Il brief evento prima dell'incontro",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Il Briccone ho pensato a un brief evento con data, ospiti e location per preparare meglio il primo incontro. Dal vostro sito emerge questo punto: incontri per definire dettagli e location degli eventi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "spaziocatering@lagastronomiadelquadrilatero.it",
    nome: "",
    azienda: "La Gastronomia del Quadrilatero",
    oggetto: "Catering, box ed eventi: richieste ordinate",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per La Gastronomia del Quadrilatero ho pensato a tre percorsi di richiesta separati, riuniti in un unico pannello operativo. Dal vostro sito emerge questo punto: tre offerte distinte: catering, box speciali e spazio eventi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@falegnameriamanzo.it",
    nome: "",
    azienda: "Falegnameria Manzo",
    oggetto: "Una scheda per i nuovi progetti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Manzo ho pensato a una scheda progetto con foto dello spazio e misure indicative. Dal vostro sito emerge questo punto: richieste tramite messaggio libero.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "scrivici@karibuopen.com",
    nome: "",
    azienda: "Karibu Open",
    oggetto: "Una pagina per i preventivi aziendali",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Karibu Open ho pensato a una pagina preventivi per eventi aziendali con raccolta ordinata delle esigenze. Dal vostro sito emerge questo punto: catering sostenibile con sede operativa dedicata.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@lavafalegnameria.com",
    nome: "",
    azienda: "Lava Falegnameria",
    oggetto: "Valorizzare i lavori e raccogliere i progetti",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Lava Falegnameria ho pensato a una vetrina dei lavori divisa per ambiente, con richiesta progetto e foto allegate. Dal vostro sito emerge questo punto: mobili su misura, porte e lavori per uffici.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@autonoleggiodesantis.it",
    nome: "",
    azienda: "Autonoleggio Desantis 1961",
    oggetto: "Tratta e passeggeri nella richiesta transfer",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Autonoleggio Desantis 1961 ho pensato a una richiesta transfer con tratta, orario, passeggeri e bagagli. Dal vostro sito emerge questo punto: transfer aeroporti, servizi aziendali, matrimoni e tour.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "traslochitraversi@gmail.com",
    nome: "",
    azienda: "Traslochi Traversi",
    oggetto: "Una richiesta trasloco più completa",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Traslochi Traversi ho pensato a un modulo trasloco con partenza, arrivo, piani e fotografie. Dal vostro sito emerge questo punto: traslochi per abitazioni e aziende su preventivo.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@garigliotorino.com",
    nome: "",
    azienda: "Gariglio Traslochi",
    oggetto: "Dai moduli ai preventivi da seguire",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Gariglio Traslochi ho pensato a un pannello a valle del modulo per sopralluoghi, offerte inviate e richiami. Dal vostro sito emerge questo punto: preventivi qualificati già raccolti online.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "rpe.traslochitorino@gmail.com",
    nome: "",
    azienda: "RPE Traslochi",
    oggetto: "Separare preventivi e modifiche al trasloco",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per RPE Traslochi ho pensato a un modulo distinto per nuovo preventivo e modifica di una prenotazione esistente. Dal vostro sito emerge questo punto: il contatto copre richieste, rinvii e modifiche del trasloco.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@bcateringtorino.it",
    nome: "",
    azienda: "BCatering Torino",
    oggetto: "Un brief diverso per ogni evento",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per BCatering Torino ho pensato a una richiesta diversa per ogni tipo di evento, con data, ospiti e servizi necessari. Dal vostro sito emerge questo punto: servizi per matrimoni, ricorrenze e incontri di lavoro.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "catering@buongustoverona.it",
    nome: "",
    azienda: "Gastronomia Buongusto",
    oggetto: "Seguire i preventivi catering dal sito",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Gastronomia Buongusto ho pensato a un pannello per seguire i preventivi catering già raccolti dal modulo. Dal vostro sito emerge questo punto: ristorante e ufficio catering con recapiti separati.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@laruotacatering.it",
    nome: "",
    azienda: "La Ruota Catering",
    oggetto: "Richieste distinte per sala e catering",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per La Ruota Catering ho pensato a due richieste guidate, per catering esterno e sala, con calendario delle richieste. Dal vostro sito emerge questo punto: catering e sala eventi con riferimenti dedicati.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "falegnameriaresistente@gmail.com",
    nome: "",
    azienda: "Falegnameria Resistente",
    oggetto: "Nuovi arredi e restauri: due richieste distinte",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria Resistente ho pensato a una scheda richiesta che distingua nuovo arredo e restauro e raccolga le fotografie. Dal vostro sito emerge questo punto: arredi su misura, restauro e piccole riparazioni.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "simararredamentiverona@gmail.com",
    nome: "",
    azienda: "Simar Arredamenti",
    oggetto: "Un brief d'arredo prima della consulenza",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Simar Arredamenti ho pensato a un percorso consulenza per ambiente e tipo di lavoro, con materiali allegabili. Dal vostro sito emerge questo punto: arredi, cucine su disegno, modifiche e servizi per esterni.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "falegnameriaduemila@libero.it",
    nome: "",
    azienda: "Falegnameria 2000",
    oggetto: "Lavori realizzati e preventivi con foto",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Falegnameria 2000 ho pensato a un portfolio per tipo di intervento e un modulo preventivi con foto. Dal vostro sito emerge questo punto: arredi su misura e ristrutturazione vecchi serramenti.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@tubinifalegnameria.it",
    nome: "",
    azienda: "Tubini Falegnameria",
    oggetto: "Un brief per i progetti HoReCa",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Tubini Falegnameria ho pensato a una richiesta progetto HoReCa con planimetria, tempi e tipo di locale. Dal vostro sito emerge questo punto: arredi su misura per ristoranti, bar e strutture turistiche.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@traslochiweb.net",
    nome: "",
    azienda: "Traslochi Palmeri Group",
    oggetto: "Raccogliere i vincoli del trasloco",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Traslochi Palmeri Group ho pensato a un preventivo guidato che raccolga indirizzi, piani, accessi e necessità di montaggio. Dal vostro sito emerge questo punto: traslochi locali e nazionali, con attenzione alla logistica urbana.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "mangreen2013@gmail.com",
    nome: "",
    azienda: "ManGreen",
    oggetto: "Sopralluoghi e manutenzioni in agenda",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per ManGreen ho pensato a una scheda sopralluogo con foto e un'agenda delle manutenzioni ricorrenti. Dal vostro sito emerge questo punto: manutenzione ordinaria e stagionale nella zona Modena–Carpi.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@cavanna.it",
    nome: "",
    azienda: "Cavanna 1863",
    oggetto: "Una checklist cliente per il trasloco",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per Cavanna 1863 ho pensato a un modulo circoscritto per condividere con il cliente la checklist preparatoria del trasloco. Dal vostro sito emerge questo punto: traslochi aziendali e privati con servizi di deposito.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  },
  {
    email: "info@ristrutturazionisuroma.com",
    nome: "",
    azienda: "SuRoma Ristrutturazioni",
    oggetto: "Un modulo cliente da valutare con il referente web",
    corpo: `Buongiorno,

sono il titolare di Tia Designs, mi occupo di siti web e strumenti digitali su misura.

Per SuRoma Ristrutturazioni ho pensato a un modulo circoscritto di raccolta documenti e preferenze del cliente, da valutare con il vostro referente web. Dal vostro sito emerge questo punto: team con ruoli tecnici e referente dedicato al reparto online.

Se non avete già uno strumento equivalente, partirei da una prima versione essenziale, con perimetro e preventivo concordati.

Ha senso sentirci 10 minuti per capire come gestite oggi queste richieste e se l'idea può esservi utile?

Tia Designs
https://tiadesigns.it`
  }
];

function formatCsv(records, overrideEmail = null) {
  const header = `"email";"nome";"azienda";"oggetto";"corpo"`;
  const rows = records.map((r) => {
    const email = overrideEmail || r.email;
    const azienda = r.azienda;
    const nome = r.nome || '';
    // Format subject as "[Azienda] - [Oggetto]"
    const formattedSubject = `${azienda} - ${r.oggetto}`;
    // Escape double quotes inside body
    const escapedBody = r.corpo.replace(/"/g, '""');
    return `"${email}";"${nome}";"${azienda}";"${formattedSubject}";"${escapedBody}"`;
  });
  return [header, ...rows].join('\n');
}

// 1. Full campaign CSV (all 100 businesses with formatted subjects)
const fullCsvContent = formatCsv(data);

// 2. Test CSV (3 businesses with info@tiadesigns.it and formatted subjects)
const testCsvContent = formatCsv(data.slice(0, 3), 'info@tiadesigns.it');

const targets = [
  { path: '/Users/tia/Downloads/campagna_aziende_tiadesigns.csv', content: fullCsvContent },
  { path: '/Users/tia/Desktop/campagna_aziende_tiadesigns.csv', content: fullCsvContent },
  { path: '/Users/tia/Downloads/Siti/portfolio/campagna_aziende_tiadesigns.csv', content: fullCsvContent },
  { path: '/Users/tia/Downloads/test_campagna_tiadesigns.csv', content: testCsvContent },
  { path: '/Users/tia/Desktop/test_campagna_tiadesigns.csv', content: testCsvContent },
  { path: '/Users/tia/Downloads/Siti/portfolio/test_campagna_tiadesigns.csv', content: testCsvContent },
];

targets.forEach((t) => {
  try {
    fs.writeFileSync(t.path, t.content, 'utf8');
    console.log(`Successfully written: ${t.path}`);
  } catch (err) {
    console.error(`Error writing ${t.path}:`, err.message);
  }
});

console.log(`Generated full campaign with ${data.length} records and test CSV with 3 records.`);
